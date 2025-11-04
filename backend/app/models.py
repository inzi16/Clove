from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


ENTITY_ID_LENGTH = 64


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    verified_domain: Mapped[str | None] = mapped_column(String(255), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class OrganizationMembership(TimestampMixin, Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_membership_org_user"),
        Index("ix_membership_user_status", "user_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(30), default="recruiter")
    status: Mapped[str] = mapped_column(String(30), default="active")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    organization: Mapped[Organization] = relationship()
    user: Mapped[User] = relationship()


class ExternalIdentity(TimestampMixin, Base):
    __tablename__ = "external_identities"
    __table_args__ = (
        UniqueConstraint(
            "provider", "issuer", "subject", name="uq_external_identity_provider_issuer_subject"
        ),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(30))
    issuer: Mapped[str] = mapped_column(String(500))
    subject: Mapped[str] = mapped_column(String(255))
    email_at_link: Mapped[str] = mapped_column(String(320))

    user: Mapped[User] = relationship()


class Job(TimestampMixin, Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_org_status", "organization_id", "status"),
        Index("ix_jobs_org_created", "organization_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    department: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(200))
    remote_policy: Mapped[str] = mapped_column(String(30), default="hybrid")
    employment_type: Mapped[str] = mapped_column(String(40), default="full_time")
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="active")
    hiring_manager: Mapped[str] = mapped_column(String(200), default="Unassigned")
    target_hires: Mapped[int] = mapped_column(Integer, default=1)
    required_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    preferred_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    min_experience_years: Mapped[float] = mapped_column(Float, default=0)


class Candidate(TimestampMixin, Base):
    __tablename__ = "candidates"
    __table_args__ = (
        Index("ix_candidates_org_email", "organization_id", "email", unique=True),
        Index("ix_candidates_org_created", "organization_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320))
    headline: Mapped[str] = mapped_column(String(240))
    location: Mapped[str] = mapped_column(String(200))
    experience_years: Mapped[float] = mapped_column(Float, default=0)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    summary: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(50), default="direct")
    embedding: Mapped[list[float]] = mapped_column(JSON, default=list)


class Application(TimestampMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_application_candidate_job"),
        Index("ix_applications_org_stage", "organization_id", "stage"),
        Index("ix_applications_org_job", "organization_id", "job_id"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    candidate_id: Mapped[str] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    stage: Mapped[str] = mapped_column(String(50), default="sourced")
    match_score: Mapped[float] = mapped_column(Float, default=0)
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    match_reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    score_version: Mapped[str] = mapped_column(String(50), default="deterministic-v1")
    score_evidence: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    candidate: Mapped[Candidate] = relationship()
    job: Mapped[Job] = relationship()


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"
    __table_args__ = (
        UniqueConstraint("job_id", "key", name="uq_pipeline_job_key"),
        UniqueConstraint("job_id", "position", name="uq_pipeline_job_position"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100))
    position: Mapped[int] = mapped_column(Integer)


class Interview(TimestampMixin, Base):
    __tablename__ = "interviews"
    __table_args__ = (
        Index("ix_interviews_org_starts", "organization_id", "starts_at"),
        Index("ix_interviews_org_creator", "organization_id", "created_by_id", "starts_at"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    candidate_id: Mapped[str] = mapped_column(ForeignKey("candidates.id"), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"), index=True)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    provider: Mapped[str] = mapped_column(String(30), default="google")
    meeting_url: Mapped[str] = mapped_column(String(500))
    participants: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(30), default="scheduled")

    candidate: Mapped[Candidate] = relationship()
    job: Mapped[Job] = relationship()


class Integration(TimestampMixin, Base):
    __tablename__ = "integrations"
    __table_args__ = (
        UniqueConstraint("organization_id", "provider", name="uq_integration_org_provider"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(40))
    category: Mapped[str] = mapped_column(String(40))
    connected: Mapped[bool] = mapped_column(Boolean, default=False)
    account_email: Mapped[str | None] = mapped_column(String(320))
    configuration: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Subscription(TimestampMixin, Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, index=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    tier: Mapped[str] = mapped_column(String(30), default="starter")
    status: Mapped[str] = mapped_column(String(30), default="active")
    seats_used: Mapped[int] = mapped_column(Integer, default=1)
    seat_limit: Mapped[int] = mapped_column(Integer, default=3)
    features: Mapped[list[str]] = mapped_column(JSON, default=list)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class WebhookReceipt(TimestampMixin, Base):
    """Durable idempotency receipt for Stripe/calendar webhook adapters."""

    __tablename__ = "webhook_receipts"
    __table_args__ = (
        UniqueConstraint("provider", "event_id", name="uq_webhook_provider_event"),
        Index("ix_webhook_org_status", "organization_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(ENTITY_ID_LENGTH), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(40))
    event_id: Mapped[str] = mapped_column(String(255))
    payload_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(30), default="processing")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
