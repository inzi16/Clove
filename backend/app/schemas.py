from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class HealthResponse(ApiModel):
    status: str
    service: str
    version: str
    environment: str
    database: str
    vector_search: str


class ScoreBreakdown(ApiModel):
    semantic: float = Field(ge=0, le=100)
    skills: float = Field(ge=0, le=100)
    experience: float = Field(ge=0, le=100)
    location: float = Field(ge=0, le=100)
    weights: dict[str, float] = Field(
        default_factory=lambda: {
            "semantic": 0.25,
            "skills": 0.40,
            "experience": 0.25,
            "location": 0.10,
        }
    )


class CandidateSummary(ApiModel):
    id: str
    name: str
    email: str
    headline: str
    location: str
    experience_years: float
    skills: list[str]
    stage: str
    match_score: float = Field(ge=0, le=100)
    score_breakdown: ScoreBreakdown
    match_reasons: list[str] = Field(default_factory=list)
    score_version: str = "deterministic-v1"
    score_evidence: dict[str, Any] = Field(default_factory=dict)
    highlights: list[str] = Field(default_factory=list)
    job_id: str
    job_title: str
    application_id: str
    applied_at: datetime


class CandidateDetail(CandidateSummary):
    summary: str
    source: str
    created_at: datetime
    updated_at: datetime


class CandidateCollection(ApiModel):
    items: list[CandidateSummary]
    total: int


class JobSummary(ApiModel):
    id: str
    title: str
    department: str
    location: str
    remote_policy: str
    employment_type: str
    status: str
    required_skills: list[str]
    skills: list[str]
    min_experience_years: float
    candidate_count: int = 0
    new_candidates: int = 0
    hiring_manager: str
    target_hires: int
    pipeline_health: Literal["strong", "attention", "new"] = "strong"
    average_match_score: float = 0
    created_at: datetime


class PipelineStageOut(ApiModel):
    key: str
    name: str
    position: int
    count: int = 0


class JobDetail(JobSummary):
    description: str
    preferred_skills: list[str]
    pipeline: list[PipelineStageOut]
    updated_at: datetime


class JobCollection(ApiModel):
    items: list[JobSummary]
    total: int


class StageUpdate(ApiModel):
    stage: str = Field(min_length=1, max_length=50)
    job_id: str | None = None

    @field_validator("stage")
    @classmethod
    def normalize_stage(cls, value: str) -> str:
        return value.strip().lower().replace(" ", "_")


class SemanticSearchRequest(ApiModel):
    query: str = Field(min_length=2, max_length=1000)
    job_id: str | None = None
    limit: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0, ge=0, le=100)


class SemanticSearchResponse(ApiModel):
    query: str
    total: int
    results: list[CandidateSummary]


class InterviewCreate(ApiModel):
    candidate_id: str
    job_id: str | None = None
    title: str | None = Field(default=None, max_length=240)
    type: str | None = Field(default=None, max_length=240)
    starts_at: datetime
    ends_at: datetime
    timezone: str = Field(default="UTC", min_length=1, max_length=100)
    provider: Literal["google", "outlook", "calendly"] = "google"
    participants: list[str] = Field(default_factory=list, max_length=30)
    interviewer_names: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("starts_at", "ends_at", mode="after")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        """Interpret naive local-development input as UTC and compare like with like."""
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_window(self) -> "InterviewCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        if (self.ends_at - self.starts_at).total_seconds() > 8 * 60 * 60:
            raise ValueError("interview duration cannot exceed 8 hours")
        return self

    @field_validator("participants", "interviewer_names")
    @classmethod
    def normalize_participants(cls, values: list[str]) -> list[str]:
        normalized: dict[str, str] = {}
        for value in values:
            stripped = value.strip()
            if stripped:
                normalized.setdefault(stripped.lower(), stripped)
        return [normalized[key] for key in sorted(normalized)]


class InterviewOut(ApiModel):
    id: str
    candidate_id: str
    candidate_name: str
    job_id: str
    job_title: str
    title: str
    type: str = "Video interview"
    starts_at: datetime
    ends_at: datetime
    timezone: str
    provider: str
    meeting_url: str
    participants: list[str]
    interviewer_names: list[str] = Field(default_factory=list)
    status: str


class InterviewCollection(ApiModel):
    items: list[InterviewOut]
    total: int


class IntegrationOut(ApiModel):
    id: str
    provider: str
    name: str
    category: str
    description: str
    connected: bool
    account_email: str | None
    account: str | None
    color: str
    initials: str
    capabilities: list[str] = Field(default_factory=list)
    last_synced_at: datetime | None


class IntegrationCollection(ApiModel):
    items: list[IntegrationOut]
    total: int


class BillingOut(ApiModel):
    tier: str
    plan: str
    status: str
    amount: int
    currency: str
    interval: str
    renewal_at: datetime | None
    seats_used: int
    seat_limit: int
    seats_total: int
    features: list[str]
    limits: dict[str, int | None]
    usage: list[dict[str, str | int | None]]
    current_period_end: datetime | None
    can_manage: bool


class DashboardMetrics(ApiModel):
    active_jobs: int
    total_candidates: int
    interviews_this_week: int
    average_match_score: float


class DashboardPipeline(ApiModel):
    stage: str
    count: int


class DashboardResponse(ApiModel):
    metrics: DashboardMetrics
    pipeline: list[DashboardPipeline]
    recent_candidates: list[CandidateSummary]
    upcoming_interviews: list[InterviewOut]


class ErrorDetail(ApiModel):
    code: str
    message: str
    context: dict[str, Any] = Field(default_factory=dict)
