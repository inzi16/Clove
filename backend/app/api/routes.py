from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.config import Settings
from app.dependencies import SessionDep, TenantDep, VectorStoreDep
from app.models import (
    Application,
    Candidate,
    Integration,
    Interview,
    Job,
    PipelineStage,
    Subscription,
)
from app.schemas import (
    BillingOut,
    CandidateCollection,
    CandidateDetail,
    CandidateSummary,
    DashboardMetrics,
    DashboardPipeline,
    DashboardResponse,
    HealthResponse,
    IntegrationCollection,
    IntegrationOut,
    InterviewCollection,
    InterviewCreate,
    InterviewOut,
    JobCollection,
    JobDetail,
    JobSummary,
    PipelineStageOut,
    SemanticSearchRequest,
    SemanticSearchResponse,
    StageUpdate,
)
from app.services.billing import PLAN_LIMITS, billing_authorization
from app.services.scheduling import SchedulingConflict, scheduling_service
from app.services.scoring import candidate_text, tokenize
from app.services.vector_search import VectorDocument


router = APIRouter()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalized_datetime(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def candidate_summary(
    application: Application,
    candidate: Candidate,
    job: Job,
    *,
    match_score: float | None = None,
    score_breakdown: dict[str, Any] | None = None,
    match_reasons: list[str] | None = None,
    highlights: list[str] | None = None,
    score_version: str | None = None,
    score_evidence: dict[str, Any] | None = None,
) -> CandidateSummary:
    return CandidateSummary(
        id=candidate.id,
        name=candidate.name,
        email=candidate.email,
        headline=candidate.headline,
        location=candidate.location,
        experience_years=candidate.experience_years,
        skills=candidate.skills,
        stage=application.stage,
        match_score=application.match_score if match_score is None else match_score,
        score_breakdown=score_breakdown or application.score_breakdown,
        match_reasons=application.match_reasons if match_reasons is None else match_reasons,
        score_version=score_version or application.score_version,
        score_evidence=score_evidence or application.score_evidence,
        highlights=highlights or [],
        job_id=job.id,
        job_title=job.title,
        application_id=application.id,
        applied_at=application.applied_at,
    )


def candidate_detail(application: Application, candidate: Candidate, job: Job) -> CandidateDetail:
    summary = candidate_summary(application, candidate, job).model_dump()
    return CandidateDetail(
        **summary,
        summary=candidate.summary,
        source=candidate.source,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
    )


def interview_out(interview: Interview, candidate: Candidate, job: Job) -> InterviewOut:
    return InterviewOut(
        id=interview.id,
        candidate_id=candidate.id,
        candidate_name=candidate.name,
        job_id=job.id,
        job_title=job.title,
        title=interview.title,
        type=interview.title,
        starts_at=normalized_datetime(interview.starts_at),
        ends_at=normalized_datetime(interview.ends_at),
        timezone=interview.timezone,
        provider=interview.provider,
        meeting_url=interview.meeting_url,
        participants=interview.participants,
        interviewer_names=interview.participants,
        status=interview.status,
    )


def pipeline_health(candidate_count: int, average_score: float) -> str:
    if candidate_count >= 3 and average_score >= 65:
        return "strong"
    if candidate_count >= 1 and average_score >= 45:
        return "attention"
    return "new"


async def candidate_rows(
    session: AsyncSession,
    organization_id: str,
    *,
    job_id: str | None = None,
    candidate_id: str | None = None,
    stage: str | None = None,
    min_score: float = 0,
) -> list[tuple[Application, Candidate, Job]]:
    statement = (
        select(Application, Candidate, Job)
        .join(Candidate, Candidate.id == Application.candidate_id)
        .join(Job, Job.id == Application.job_id)
        .where(
            Application.organization_id == organization_id,
            Candidate.organization_id == organization_id,
            Job.organization_id == organization_id,
            Application.match_score >= min_score,
        )
        .order_by(Application.applied_at.desc(), Candidate.id)
    )
    if job_id:
        statement = statement.where(Application.job_id == job_id)
    if candidate_id:
        statement = statement.where(Application.candidate_id == candidate_id)
    if stage:
        statement = statement.where(Application.stage == stage)
    result = await session.execute(statement)
    return [(row[0], row[1], row[2]) for row in result.all()]


async def interview_rows(
    session: AsyncSession,
    organization_id: str,
    *,
    upcoming: bool = True,
    limit: int | None = None,
) -> list[tuple[Interview, Candidate, Job]]:
    statement = (
        select(Interview, Candidate, Job)
        .join(Candidate, Candidate.id == Interview.candidate_id)
        .join(Job, Job.id == Interview.job_id)
        .where(
            Interview.organization_id == organization_id,
            Candidate.organization_id == organization_id,
            Job.organization_id == organization_id,
        )
        .order_by(Interview.starts_at.asc())
    )
    if upcoming:
        statement = statement.where(Interview.ends_at >= utcnow())
    if limit:
        statement = statement.limit(limit)
    result = await session.execute(statement)
    return [(row[0], row[1], row[2]) for row in result.all()]


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health(request: Request) -> HealthResponse:
    settings: Settings = request.app.state.settings
    database_name = "postgresql" if settings.database_url.startswith("postgresql") else "sqlite"
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=__version__,
        environment=settings.environment,
        database=database_name,
        vector_search=request.app.state.vector_store.backend_name,
    )


@router.get("/dashboard", response_model=DashboardResponse, tags=["dashboard"])
async def dashboard(session: SessionDep, tenant: TenantDep) -> DashboardResponse:
    org_id = tenant.organization_id
    now = utcnow()
    week_end = now + timedelta(days=7)
    active_jobs = int(
        await session.scalar(
            select(func.count(Job.id)).where(Job.organization_id == org_id, Job.status == "active")
        )
        or 0
    )
    total_candidates = int(
        await session.scalar(
            select(func.count(distinct(Candidate.id))).where(Candidate.organization_id == org_id)
        )
        or 0
    )
    interviews_this_week = int(
        await session.scalar(
            select(func.count(Interview.id)).where(
                Interview.organization_id == org_id,
                Interview.starts_at >= now,
                Interview.starts_at < week_end,
                Interview.status == "scheduled",
            )
        )
        or 0
    )
    average_match_score = float(
        await session.scalar(
            select(func.avg(Application.match_score)).where(Application.organization_id == org_id)
        )
        or 0
    )
    pipeline_result = await session.execute(
        select(Application.stage, func.count(Application.id))
        .where(Application.organization_id == org_id)
        .group_by(Application.stage)
    )
    counts = {stage: int(count) for stage, count in pipeline_result.all()}
    pipeline = [DashboardPipeline(stage=stage, count=counts.get(stage, 0)) for stage in (
        "sourced", "screening", "interview", "offer", "hired", "rejected"
    )]
    recent = await candidate_rows(session, org_id)
    upcoming = await interview_rows(session, org_id, upcoming=True, limit=4)
    return DashboardResponse(
        metrics=DashboardMetrics(
            active_jobs=active_jobs,
            total_candidates=total_candidates,
            interviews_this_week=interviews_this_week,
            average_match_score=round(average_match_score, 1),
        ),
        pipeline=pipeline,
        recent_candidates=[candidate_summary(*row) for row in recent[:5]],
        upcoming_interviews=[interview_out(*row) for row in upcoming],
    )


@router.get("/jobs", response_model=JobCollection, tags=["jobs"])
async def list_jobs(
    session: SessionDep,
    tenant: TenantDep,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> JobCollection:
    new_since = utcnow() - timedelta(days=7)
    statement = (
        select(
            Job,
            func.count(Application.id).label("candidate_count"),
            func.coalesce(func.avg(Application.match_score), 0).label("average_score"),
            func.sum(case((Application.applied_at >= new_since, 1), else_=0)).label("new_candidates"),
        )
        .outerjoin(
            Application,
            (Application.job_id == Job.id) & (Application.organization_id == tenant.organization_id),
        )
        .where(Job.organization_id == tenant.organization_id)
        .group_by(Job.id)
        .order_by(Job.created_at.desc())
    )
    if status_filter:
        statement = statement.where(Job.status == status_filter)
    rows = (await session.execute(statement)).all()
    items = []
    for job, count, average, new_count in rows:
        count_value = int(count or 0)
        average_value = round(float(average or 0), 1)
        items.append(
            JobSummary(
                id=job.id,
                title=job.title,
                department=job.department,
                location=job.location,
                remote_policy=job.remote_policy,
                employment_type=job.employment_type,
                status=job.status,
                required_skills=job.required_skills,
                skills=job.required_skills,
                min_experience_years=job.min_experience_years,
                candidate_count=count_value,
                new_candidates=int(new_count or 0),
                hiring_manager=job.hiring_manager,
                target_hires=job.target_hires,
                pipeline_health=pipeline_health(count_value, average_value),
                average_match_score=average_value,
                created_at=job.created_at,
            )
        )
    return JobCollection(items=items, total=len(items))


@router.get("/jobs/{job_id}", response_model=JobDetail, tags=["jobs"])
async def get_job(job_id: str, session: SessionDep, tenant: TenantDep) -> JobDetail:
    job = await session.scalar(
        select(Job).where(Job.id == job_id, Job.organization_id == tenant.organization_id)
    )
    if job is None:
        raise HTTPException(status_code=404, detail={"code": "job_not_found", "message": "Job not found"})
    applications = list(
        await session.scalars(
            select(Application).where(
                Application.organization_id == tenant.organization_id, Application.job_id == job.id
            )
        )
    )
    counts: dict[str, int] = {}
    for application in applications:
        counts[application.stage] = counts.get(application.stage, 0) + 1
    stages = list(
        await session.scalars(
            select(PipelineStage)
            .where(
                PipelineStage.organization_id == tenant.organization_id,
                PipelineStage.job_id == job.id,
            )
            .order_by(PipelineStage.position)
        )
    )
    average = sum(app.match_score for app in applications) / len(applications) if applications else 0
    new_candidates = sum(
        1
        for app in applications
        if normalized_datetime(app.applied_at) >= utcnow() - timedelta(days=7)
    )
    return JobDetail(
        id=job.id,
        title=job.title,
        department=job.department,
        location=job.location,
        remote_policy=job.remote_policy,
        employment_type=job.employment_type,
        status=job.status,
        required_skills=job.required_skills,
        skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        min_experience_years=job.min_experience_years,
        candidate_count=len(applications),
        new_candidates=new_candidates,
        hiring_manager=job.hiring_manager,
        target_hires=job.target_hires,
        pipeline_health=pipeline_health(len(applications), average),
        average_match_score=round(average, 1),
        created_at=job.created_at,
        updated_at=job.updated_at,
        description=job.description,
        pipeline=[
            PipelineStageOut(key=stage.key, name=stage.name, position=stage.position, count=counts.get(stage.key, 0))
            for stage in stages
        ],
    )


@router.get("/jobs/{job_id}/candidates", response_model=CandidateCollection, tags=["jobs"])
async def get_job_candidates(
    job_id: str,
    session: SessionDep,
    tenant: TenantDep,
    query: Annotated[str | None, Query(max_length=200)] = None,
    min_score: Annotated[float, Query(ge=0, le=100)] = 0,
) -> CandidateCollection:
    job_exists = await session.scalar(
        select(Job.id).where(Job.id == job_id, Job.organization_id == tenant.organization_id)
    )
    if job_exists is None:
        raise HTTPException(status_code=404, detail={"code": "job_not_found", "message": "Job not found"})
    rows = await candidate_rows(session, tenant.organization_id, job_id=job_id, min_score=min_score)
    if query:
        needle = query.lower().strip()
        rows = [
            row
            for row in rows
            if needle
            in " ".join([row[1].name, row[1].email, row[1].headline, row[1].summary, *row[1].skills]).lower()
        ]
    return CandidateCollection(items=[candidate_summary(*row) for row in rows], total=len(rows))


@router.get("/candidates", response_model=CandidateCollection, tags=["candidates"])
async def list_candidates(
    session: SessionDep,
    tenant: TenantDep,
    job_id: str | None = None,
    stage: str | None = None,
    query: Annotated[str | None, Query(max_length=200)] = None,
    min_score: Annotated[float, Query(ge=0, le=100)] = 0,
) -> CandidateCollection:
    rows = await candidate_rows(
        session,
        tenant.organization_id,
        job_id=job_id,
        stage=stage,
        min_score=min_score,
    )
    if query:
        needle = query.lower().strip()
        rows = [
            row
            for row in rows
            if needle
            in " ".join([row[1].name, row[1].email, row[1].headline, row[1].summary, *row[1].skills]).lower()
        ]
    return CandidateCollection(items=[candidate_summary(*row) for row in rows], total=len(rows))


@router.get("/candidates/{candidate_id}", response_model=CandidateDetail, tags=["candidates"])
async def get_candidate(
    candidate_id: str,
    session: SessionDep,
    tenant: TenantDep,
    job_id: str | None = None,
) -> CandidateDetail:
    rows = await candidate_rows(
        session, tenant.organization_id, job_id=job_id, candidate_id=candidate_id
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"code": "candidate_not_found", "message": "Candidate not found"},
        )
    return candidate_detail(*rows[0])


@router.patch(
    "/candidates/{candidate_id}/stage", response_model=CandidateDetail, tags=["candidates"]
)
async def update_candidate_stage(
    candidate_id: str,
    payload: StageUpdate,
    session: SessionDep,
    tenant: TenantDep,
) -> CandidateDetail:
    rows = await candidate_rows(
        session,
        tenant.organization_id,
        job_id=payload.job_id,
        candidate_id=candidate_id,
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"code": "candidate_not_found", "message": "Candidate application not found"},
        )
    application, candidate, job = rows[0]
    valid_stage = await session.scalar(
        select(PipelineStage.id).where(
            PipelineStage.organization_id == tenant.organization_id,
            PipelineStage.job_id == job.id,
            PipelineStage.key == payload.stage,
        )
    )
    if valid_stage is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_pipeline_stage",
                "message": f"'{payload.stage}' is not a stage for this job",
            },
        )
    application.stage = payload.stage
    application.rejected_at = utcnow() if payload.stage == "rejected" else None
    await session.commit()
    await session.refresh(application)
    return candidate_detail(application, candidate, job)


@router.post("/search/semantic", response_model=SemanticSearchResponse, tags=["search"])
async def semantic_search(
    payload: SemanticSearchRequest,
    session: SessionDep,
    tenant: TenantDep,
    vector_store: VectorStoreDep,
) -> SemanticSearchResponse:
    subscription = await session.scalar(
        select(Subscription).where(Subscription.organization_id == tenant.organization_id)
    )
    if subscription is None:
        raise HTTPException(status_code=402, detail={"code": "subscription_required"})
    billing_authorization.require_feature(subscription, "semantic_search")

    rows = await candidate_rows(
        session, tenant.organization_id, job_id=payload.job_id, min_score=0
    )
    # Keep one application context per candidate while the vector store searches identity profiles.
    row_by_candidate: dict[str, tuple[Application, Candidate, Job]] = {}
    for row in rows:
        row_by_candidate.setdefault(row[1].id, row)
    documents = [
        VectorDocument(
            candidate_id=candidate.id,
            organization_id=candidate.organization_id,
            embedding=candidate.embedding,
        )
        for _, candidate, _ in row_by_candidate.values()
    ]
    hits = await vector_store.search(
        query=payload.query,
        organization_id=tenant.organization_id,
        documents=documents,
        limit=payload.limit,
    )
    query_tokens = set(tokenize(payload.query))
    results: list[CandidateSummary] = []
    for hit in hits:
        row = row_by_candidate.get(hit.candidate_id)
        if row is None:
            continue
        application, candidate, job = row
        semantic_score = round(hit.similarity * 100, 1)
        hybrid_score = round((semantic_score * 0.70) + (application.match_score * 0.30), 1)
        if hybrid_score < payload.min_score:
            continue
        profile_tokens = set(tokenize(candidate_text(candidate)))
        matching_terms = sorted(query_tokens & profile_tokens)
        highlights = [f"Query match: {term}" for term in matching_terms[:4]]
        reasons = [f"Vector similarity to search query: {semantic_score:.1f}%"]
        reasons.extend(application.match_reasons[:3])
        breakdown = dict(application.score_breakdown)
        breakdown["semantic"] = semantic_score
        evidence = dict(application.score_evidence)
        evidence.update(
            {
                "search_query": payload.query,
                "matching_query_terms": matching_terms,
                "search_semantic_score": semantic_score,
                "search_formula": "70% query similarity + 30% job match",
            }
        )
        results.append(
            candidate_summary(
                application,
                candidate,
                job,
                match_score=hybrid_score,
                score_breakdown=breakdown,
                match_reasons=reasons,
                highlights=highlights,
                score_version=f"{application.score_version}+search-v1",
                score_evidence=evidence,
            )
        )
    return SemanticSearchResponse(query=payload.query, total=len(results), results=results)


@router.get("/interviews", response_model=InterviewCollection, tags=["interviews"])
async def list_interviews(
    session: SessionDep,
    tenant: TenantDep,
    upcoming: bool = True,
) -> InterviewCollection:
    rows = await interview_rows(session, tenant.organization_id, upcoming=upcoming)
    return InterviewCollection(items=[interview_out(*row) for row in rows], total=len(rows))


@router.post(
    "/interviews",
    response_model=InterviewOut,
    status_code=status.HTTP_201_CREATED,
    tags=["interviews"],
)
async def create_interview(
    payload: InterviewCreate,
    session: SessionDep,
    tenant: TenantDep,
) -> InterviewOut:
    subscription = await session.scalar(
        select(Subscription).where(Subscription.organization_id == tenant.organization_id)
    )
    if subscription is None:
        raise HTTPException(status_code=402, detail={"code": "subscription_required"})
    billing_authorization.require_feature(subscription, "calendar_integrations")

    rows = await candidate_rows(
        session,
        tenant.organization_id,
        job_id=payload.job_id,
        candidate_id=payload.candidate_id,
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"code": "candidate_not_found", "message": "Candidate application not found"},
        )
    application, candidate, job = rows[0]
    starts_at = normalized_datetime(payload.starts_at)
    ends_at = normalized_datetime(payload.ends_at)
    participants = sorted(
        set([*payload.participants, *payload.interviewer_names, tenant.user.email])
    )
    try:
        await scheduling_service.ensure_available(
            session,
            organization_id=tenant.organization_id,
            organizer_id=tenant.user.id,
            starts_at=starts_at,
            ends_at=ends_at,
            participants=participants,
        )
    except SchedulingConflict as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "scheduling_conflict",
                "message": str(exc),
                "conflicts": [
                    {
                        "interview_id": conflict.interview_id,
                        "title": conflict.title,
                        "starts_at": conflict.starts_at.isoformat(),
                        "ends_at": conflict.ends_at.isoformat(),
                    }
                    for conflict in exc.conflicts
                ],
            },
        ) from exc

    interview_id = f"interview_{uuid.uuid4().hex}"
    meeting_url = await scheduling_service.create_meeting_link(payload.provider, interview_id)
    interview = Interview(
        id=interview_id,
        organization_id=tenant.organization_id,
        application_id=application.id,
        candidate_id=candidate.id,
        job_id=job.id,
        created_by_id=tenant.user.id,
        title=payload.title or payload.type or f"{job.title} interview with {candidate.name}",
        starts_at=starts_at,
        ends_at=ends_at,
        timezone=payload.timezone,
        provider=payload.provider,
        meeting_url=meeting_url,
        participants=participants,
        status="scheduled",
    )
    session.add(interview)
    await session.commit()
    await session.refresh(interview)
    return interview_out(interview, candidate, job)


@router.get("/integrations", response_model=IntegrationCollection, tags=["integrations"])
async def list_integrations(session: SessionDep, tenant: TenantDep) -> IntegrationCollection:
    integrations = list(
        await session.scalars(
            select(Integration)
            .where(Integration.organization_id == tenant.organization_id)
            .order_by(Integration.category, Integration.provider)
        )
    )
    items = []
    for integration in integrations:
        config = integration.configuration
        items.append(
            IntegrationOut(
                id=integration.id,
                provider=integration.provider,
                name=str(config.get("name", integration.provider.title())),
                category=integration.category,
                description=str(config.get("description", "")),
                connected=integration.connected,
                account_email=integration.account_email,
                account=integration.account_email,
                color=str(config.get("color", "#64748B")),
                initials=str(config.get("initials", integration.provider[:2].upper())),
                capabilities=list(config.get("capabilities", [])),
                last_synced_at=integration.last_synced_at,
            )
        )
    return IntegrationCollection(items=items, total=len(items))


@router.get("/billing", response_model=BillingOut, tags=["billing"])
async def get_billing(session: SessionDep, tenant: TenantDep) -> BillingOut:
    subscription = await session.scalar(
        select(Subscription).where(Subscription.organization_id == tenant.organization_id)
    )
    if subscription is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "subscription_not_found", "message": "Subscription not found"},
        )
    access = billing_authorization.access(subscription)
    active_jobs = int(
        await session.scalar(
            select(func.count(Job.id)).where(
                Job.organization_id == tenant.organization_id, Job.status == "active"
            )
        )
        or 0
    )
    candidates = int(
        await session.scalar(
            select(func.count(Candidate.id)).where(Candidate.organization_id == tenant.organization_id)
        )
        or 0
    )
    plan_prices = {"starter": 4900, "growth": 14900, "enterprise": 0}
    limits = PLAN_LIMITS.get(subscription.tier, PLAN_LIMITS["starter"])
    return BillingOut(
        tier=subscription.tier,
        plan=subscription.tier.title(),
        status=subscription.status,
        amount=plan_prices.get(subscription.tier, 0),
        currency="usd",
        interval="month",
        renewal_at=subscription.current_period_end,
        seats_used=subscription.seats_used,
        seat_limit=subscription.seat_limit,
        seats_total=subscription.seat_limit,
        features=sorted(access.features),
        limits=access.limits,
        usage=[
            {"label": "Team seats", "used": subscription.seats_used, "limit": subscription.seat_limit},
            {"label": "Active jobs", "used": active_jobs, "limit": limits["active_jobs"]},
            {"label": "Candidates", "used": candidates, "limit": limits["candidates_per_month"]},
        ],
        current_period_end=subscription.current_period_end,
        can_manage=tenant.membership.role in {"owner", "admin"},
    )
