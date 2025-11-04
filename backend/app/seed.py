from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import (
    Application,
    Candidate,
    ExternalIdentity,
    Integration,
    Interview,
    Job,
    Organization,
    OrganizationMembership,
    PipelineStage,
    Subscription,
    User,
)
from app.services.scoring import (
    CandidateScorer,
    EmbeddingProvider,
    FeatureHashEmbeddingProvider,
    candidate_text,
)


DEMO_ORG_ID = "org_northstar"
DEMO_USER_ID = "demo-user"
OTHER_USER_ID = "user_other_tenant"

PIPELINE = [
    ("sourced", "Sourced"),
    ("screening", "Screening"),
    ("interview", "Interview"),
    ("offer", "Offer"),
    ("hired", "Hired"),
    ("rejected", "Rejected"),
]


async def seed_demo_data(
    session: AsyncSession,
    settings: Settings,
    embedding_provider: EmbeddingProvider | None = None,
) -> None:
    if await session.scalar(select(Organization.id).where(Organization.id == DEMO_ORG_ID)):
        return

    now = datetime.now(timezone.utc)
    provider = embedding_provider or FeatureHashEmbeddingProvider(settings.embedding_dimensions)
    scorer = CandidateScorer(embedding_provider=provider)

    demo_org = Organization(
        id=DEMO_ORG_ID,
        name="Northstar Labs",
        slug="northstar-labs",
        verified_domain="northstar.example",
    )
    demo_user = User(
        id=DEMO_USER_ID,
        email="alex@northstar.example",
        name="Alex Morgan",
    )
    demo_membership = OrganizationMembership(
        id="membership_northstar_admin",
        organization_id=demo_org.id,
        user_id=demo_user.id,
        role="admin",
        status="active",
        is_default=True,
    )
    demo_identity = ExternalIdentity(
        id="identity_demo_admin",
        user_id=demo_user.id,
        provider="development",
        issuer="clove-local",
        subject=demo_user.id,
        email_at_link=demo_user.email,
    )
    session.add_all([demo_org, demo_user, demo_membership, demo_identity])
    await session.flush()

    jobs = [
        Job(
            id="job_backend",
            organization_id=demo_org.id,
            created_by_id=demo_user.id,
            title="Senior Backend Engineer",
            department="Engineering",
            location="Bengaluru, India",
            remote_policy="hybrid",
            employment_type="full_time",
            description=(
                "Build resilient Python services and APIs for a multi-tenant recruiting platform. "
                "Own PostgreSQL performance, cloud infrastructure, and pragmatic system design."
            ),
            status="active",
            hiring_manager="Neha Rao",
            target_hires=2,
            required_skills=["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
            preferred_skills=["Kubernetes", "Milvus", "Redis"],
            min_experience_years=5,
            created_at=now - timedelta(days=31),
        ),
        Job(
            id="job_product_design",
            organization_id=demo_org.id,
            created_by_id=demo_user.id,
            title="Senior Product Designer",
            department="Design",
            location="London, UK",
            remote_policy="remote",
            employment_type="full_time",
            description=(
                "Lead end-to-end product design for recruiter workflows, from discovery and "
                "prototyping through accessible design systems and polished delivery."
            ),
            status="active",
            hiring_manager="Marcus Chen",
            target_hires=1,
            required_skills=["Figma", "Product Design", "UX Research", "Prototyping"],
            preferred_skills=["Design Systems", "Accessibility"],
            min_experience_years=5,
            created_at=now - timedelta(days=19),
        ),
        Job(
            id="job_ml_engineer",
            organization_id=demo_org.id,
            created_by_id=demo_user.id,
            title="Machine Learning Engineer",
            department="AI",
            location="Remote — India",
            remote_policy="remote",
            employment_type="full_time",
            description=(
                "Productionize ranking, retrieval, and language-model systems. Improve embeddings, "
                "evaluation, vector search quality, monitoring, and responsible AI practices."
            ),
            status="active",
            hiring_manager="Isha Kapoor",
            target_hires=2,
            required_skills=["Python", "Machine Learning", "PyTorch", "NLP"],
            preferred_skills=["Milvus", "MLOps", "FastAPI"],
            min_experience_years=4,
            created_at=now - timedelta(days=11),
        ),
        Job(
            id="job_growth_archived",
            organization_id=demo_org.id,
            created_by_id=demo_user.id,
            title="Growth Marketing Lead",
            department="Marketing",
            location="New York, USA",
            remote_policy="hybrid",
            employment_type="full_time",
            description="Build the growth engine across acquisition, lifecycle, and analytics.",
            status="closed",
            hiring_manager="Alex Morgan",
            target_hires=1,
            required_skills=["Growth Strategy", "Analytics", "Lifecycle Marketing"],
            preferred_skills=["B2B SaaS"],
            min_experience_years=6,
            created_at=now - timedelta(days=70),
        ),
    ]
    session.add_all(jobs)
    await session.flush()
    for job in jobs:
        for position, (key, name) in enumerate(PIPELINE):
            session.add(
                PipelineStage(
                    id=f"stage_{job.id.removeprefix('job_')}_{key}",
                    organization_id=demo_org.id,
                    job_id=job.id,
                    key=key,
                    name=name,
                    position=position,
                )
            )

    candidate_specs = [
        {
            "id": "cand_priya",
            "name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "headline": "Backend engineer building scalable Python platforms",
            "location": "Bengaluru, India",
            "experience_years": 6.5,
            "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Redis"],
            "summary": "Led API and data-platform work for a high-volume SaaS product, with deep ownership of async Python, PostgreSQL tuning, AWS, observability, and mentoring.",
            "source": "linkedin",
            "job_id": "job_backend",
            "stage": "interview",
            "days_ago": 4,
        },
        {
            "id": "cand_arjun",
            "name": "Arjun Mehta",
            "email": "arjun.mehta@example.com",
            "headline": "Python engineer focused on reliable APIs",
            "location": "Pune, India",
            "experience_years": 4.5,
            "skills": ["Python", "Django", "PostgreSQL", "Docker", "Redis", "AWS"],
            "summary": "Built service-oriented fintech products, improved database latency, and shipped containerized workloads on AWS. Currently learning FastAPI and Kubernetes.",
            "source": "referral",
            "job_id": "job_backend",
            "stage": "screening",
            "days_ago": 2,
        },
        {
            "id": "cand_maya",
            "name": "Maya Iyer",
            "email": "maya.iyer@example.com",
            "headline": "Cloud platform engineer",
            "location": "Chennai, India",
            "experience_years": 7,
            "skills": ["Java", "Spring", "AWS", "Kubernetes", "Docker", "PostgreSQL"],
            "summary": "Platform engineer experienced in distributed JVM systems, Kubernetes operations, cloud architecture, and developer productivity tooling.",
            "source": "direct",
            "job_id": "job_backend",
            "stage": "sourced",
            "days_ago": 1,
        },
        {
            "id": "cand_elena",
            "name": "Elena Rossi",
            "email": "elena.rossi@example.com",
            "headline": "Senior product designer for complex B2B tools",
            "location": "Milan, Italy",
            "experience_years": 7.5,
            "skills": ["Figma", "Product Design", "UX Research", "Prototyping", "Design Systems", "Accessibility"],
            "summary": "Turns complex enterprise workflows into calm, accessible products. Established a multi-brand design system and research practice for a global SaaS team.",
            "source": "linkedin",
            "job_id": "job_product_design",
            "stage": "interview",
            "days_ago": 6,
        },
        {
            "id": "cand_rohan",
            "name": "Rohan Gupta",
            "email": "rohan.gupta@example.com",
            "headline": "Product designer and prototyper",
            "location": "London, UK",
            "experience_years": 4,
            "skills": ["Figma", "Product Design", "Prototyping", "User Testing", "Motion Design"],
            "summary": "Designs and prototypes consumer and marketplace experiences, partnering closely with product and engineering from concept through release.",
            "source": "portfolio",
            "job_id": "job_product_design",
            "stage": "sourced",
            "days_ago": 3,
        },
        {
            "id": "cand_sana",
            "name": "Sana Khan",
            "email": "sana.khan@example.com",
            "headline": "Machine learning engineer specializing in NLP and retrieval",
            "location": "Hyderabad, India",
            "experience_years": 5.5,
            "skills": ["Python", "Machine Learning", "PyTorch", "NLP", "Milvus", "MLOps", "FastAPI"],
            "summary": "Shipped embedding retrieval and ranking systems, built offline evaluations, and operated NLP models with responsible monitoring in production.",
            "source": "referral",
            "job_id": "job_ml_engineer",
            "stage": "offer",
            "days_ago": 8,
        },
        {
            "id": "cand_vikram",
            "name": "Vikram Singh",
            "email": "vikram.singh@example.com",
            "headline": "Applied ML engineer",
            "location": "Delhi, India",
            "experience_years": 4.5,
            "skills": ["Python", "Machine Learning", "TensorFlow", "NLP", "MLOps", "Docker"],
            "summary": "Developed text classification and recommendation models, automated training pipelines, and collaborated on production model serving.",
            "source": "linkedin",
            "job_id": "job_ml_engineer",
            "stage": "screening",
            "days_ago": 5,
        },
        {
            "id": "cand_aisha",
            "name": "Aisha Thomas",
            "email": "aisha.thomas@example.com",
            "headline": "Data scientist transitioning to ML engineering",
            "location": "Kochi, India",
            "experience_years": 3,
            "skills": ["Python", "Machine Learning", "scikit-learn", "SQL", "Analytics"],
            "summary": "Built customer analytics models and experimentation dashboards, with recent work on model APIs and natural-language processing.",
            "source": "direct",
            "job_id": "job_ml_engineer",
            "stage": "rejected",
            "days_ago": 10,
        },
    ]

    jobs_by_id = {job.id: job for job in jobs}
    candidates_by_id: dict[str, Candidate] = {}
    applications_by_candidate: dict[str, Application] = {}
    for spec in candidate_specs:
        candidate = Candidate(
            id=str(spec["id"]),
            organization_id=demo_org.id,
            name=str(spec["name"]),
            email=str(spec["email"]),
            headline=str(spec["headline"]),
            location=str(spec["location"]),
            experience_years=float(spec["experience_years"]),
            skills=list(spec["skills"]),
            summary=str(spec["summary"]),
            source=str(spec["source"]),
            created_at=now - timedelta(days=int(spec["days_ago"])),
        )
        candidate.embedding = provider.embed(candidate_text(candidate))
        job = jobs_by_id[str(spec["job_id"])]
        result = scorer.score(candidate, job)
        application = Application(
            id=f"app_{candidate.id.removeprefix('cand_')}",
            organization_id=demo_org.id,
            candidate_id=candidate.id,
            job_id=job.id,
            stage=str(spec["stage"]),
            match_score=result.total,
            score_breakdown=result.breakdown,
            match_reasons=result.reasons,
            score_version=result.version,
            score_evidence=result.evidence,
            applied_at=now - timedelta(days=int(spec["days_ago"])),
        )
        candidates_by_id[candidate.id] = candidate
        applications_by_candidate[candidate.id] = application
        session.add_all([candidate, application])

    interviews = [
        Interview(
            id="interview_priya_technical",
            organization_id=demo_org.id,
            application_id=applications_by_candidate["cand_priya"].id,
            candidate_id="cand_priya",
            job_id="job_backend",
            created_by_id=demo_user.id,
            title="Technical interview",
            starts_at=now + timedelta(days=1, hours=2),
            ends_at=now + timedelta(days=1, hours=3),
            timezone="Asia/Kolkata",
            provider="google",
            meeting_url="https://meet.google.com/nth-str-demo",
            participants=["Neha Rao", "Omar Williams"],
        ),
        Interview(
            id="interview_elena_portfolio",
            organization_id=demo_org.id,
            application_id=applications_by_candidate["cand_elena"].id,
            candidate_id="cand_elena",
            job_id="job_product_design",
            created_by_id=demo_user.id,
            title="Portfolio review",
            starts_at=now + timedelta(days=3, hours=4),
            ends_at=now + timedelta(days=3, hours=5),
            timezone="Europe/London",
            provider="outlook",
            meeting_url="https://teams.microsoft.com/l/meetup-join/northstar-demo",
            participants=["Marcus Chen", "Lena Ortiz"],
        ),
        Interview(
            id="interview_vikram_screen",
            organization_id=demo_org.id,
            application_id=applications_by_candidate["cand_vikram"].id,
            candidate_id="cand_vikram",
            job_id="job_ml_engineer",
            created_by_id=demo_user.id,
            title="Hiring manager screen",
            starts_at=now + timedelta(days=5, hours=1),
            ends_at=now + timedelta(days=5, hours=1, minutes=45),
            timezone="Asia/Kolkata",
            provider="calendly",
            meeting_url="https://calendly.com/events/northstar-demo",
            participants=["Isha Kapoor"],
        ),
    ]
    session.add_all(interviews)

    integration_specs = [
        ("google", "calendar", True, "Google Calendar", "Schedule interviews and create Google Meet links.", "#4285F4", "G", ["calendar_read", "calendar_write", "meeting_links"]),
        ("outlook", "calendar", True, "Microsoft Outlook", "See conflicts and schedule Microsoft Teams interviews.", "#6264A7", "O", ["calendar_read", "calendar_write", "meeting_links"]),
        ("calendly", "scheduling", True, "Calendly", "Share candidate booking links and sync scheduled events.", "#006BFF", "C", ["booking_links", "event_sync"]),
        ("stripe", "billing", True, "Stripe", "Manage subscriptions, invoices, and metered plan limits.", "#635BFF", "S", ["subscriptions", "invoices", "webhooks"]),
        ("linkedin", "sourcing", False, "LinkedIn Recruiter", "Import sourced candidates and profile context.", "#0A66C2", "in", ["candidate_import"]),
    ]
    for provider_name, category, connected, name, description, color, initials, capabilities in integration_specs:
        session.add(
            Integration(
                id=f"integration_{provider_name}",
                organization_id=demo_org.id,
                provider=provider_name,
                category=category,
                connected=connected,
                account_email=demo_user.email if connected else None,
                configuration={
                    "name": name,
                    "description": description,
                    "color": color,
                    "initials": initials,
                    "capabilities": capabilities,
                },
                last_synced_at=now - timedelta(minutes=12) if connected else None,
            )
        )

    session.add(
        Subscription(
            id="subscription_northstar",
            organization_id=demo_org.id,
            stripe_customer_id="cus_demo_northstar",
            tier="growth",
            status="active",
            seats_used=6,
            seat_limit=15,
            features=[
                "semantic_search",
                "candidate_scoring",
                "calendar_integrations",
                "custom_pipeline",
                "analytics",
            ],
            current_period_end=now + timedelta(days=19),
        )
    )

    # A second seeded tenant makes accidental cross-tenant query leaks testable.
    other_org = Organization(
        id="org_contoso",
        name="Contoso Talent",
        slug="contoso-talent",
        verified_domain="contoso.example",
    )
    other_user = User(id=OTHER_USER_ID, email="owner@contoso.example", name="Taylor Reed")
    session.add_all(
        [
            other_org,
            other_user,
            OrganizationMembership(
                id="membership_contoso_owner",
                organization_id=other_org.id,
                user_id=other_user.id,
                role="owner",
                status="active",
                is_default=True,
            ),
            ExternalIdentity(
                id="identity_contoso_owner",
                user_id=other_user.id,
                provider="development",
                issuer="clove-local",
                subject=other_user.id,
                email_at_link=other_user.email,
            ),
        ]
    )
    await session.flush()
    other_job = Job(
        id="job_contoso_secret",
        organization_id=other_org.id,
        created_by_id=other_user.id,
        title="Confidential Executive Role",
        department="Executive",
        location="Seattle, USA",
        remote_policy="onsite",
        employment_type="full_time",
        description="Private role belonging to another tenant.",
        status="active",
        hiring_manager="Taylor Reed",
        target_hires=1,
        required_skills=["Strategy"],
        preferred_skills=[],
        min_experience_years=10,
    )
    other_candidate = Candidate(
        id="cand_contoso_private",
        organization_id=other_org.id,
        name="Private Candidate",
        email="private.candidate@example.net",
        headline="Executive leader",
        location="Seattle, USA",
        experience_years=15,
        skills=["Strategy"],
        summary="Confidential candidate belonging to another tenant.",
        source="executive_search",
    )
    other_candidate.embedding = provider.embed(candidate_text(other_candidate))
    other_score = scorer.score(other_candidate, other_job)
    session.add_all([other_job, other_candidate])
    await session.flush()
    session.add_all(
        [
            Application(
                id="app_contoso_private",
                organization_id=other_org.id,
                candidate_id=other_candidate.id,
                job_id=other_job.id,
                stage="sourced",
                match_score=other_score.total,
                score_breakdown=other_score.breakdown,
                match_reasons=other_score.reasons,
                score_version=other_score.version,
                score_evidence=other_score.evidence,
            ),
            Subscription(
                id="subscription_contoso",
                organization_id=other_org.id,
                tier="starter",
                status="active",
                seats_used=1,
                seat_limit=3,
                features=["candidate_scoring"],
            ),
        ]
    )

    await session.commit()
