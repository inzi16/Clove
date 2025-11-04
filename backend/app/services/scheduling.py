from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Interview


@dataclass(frozen=True)
class Conflict:
    interview_id: str
    title: str
    starts_at: datetime
    ends_at: datetime


class SchedulingConflict(ValueError):
    def __init__(self, conflicts: list[Conflict]) -> None:
        super().__init__("The requested time conflicts with an existing interview")
        self.conflicts = conflicts


class MeetingProvider(Protocol):
    provider_name: str

    async def create_link(self, interview_id: str) -> str: ...


class DeterministicMeetingProvider:
    """Local adapter with provider-shaped links; replace with provider SDK calls."""

    def __init__(self, provider_name: str) -> None:
        self.provider_name = provider_name

    async def create_link(self, interview_id: str) -> str:
        code = hashlib.sha256(f"{self.provider_name}:{interview_id}".encode()).hexdigest()[:12]
        if self.provider_name == "google":
            return f"https://meet.google.com/{code[:3]}-{code[3:7]}-{code[7:10]}"
        if self.provider_name == "outlook":
            return f"https://teams.microsoft.com/l/meetup-join/{code}"
        return f"https://calendly.com/events/{code}"


class SchedulingService:
    def __init__(self) -> None:
        self.providers: dict[str, MeetingProvider] = {
            name: DeterministicMeetingProvider(name) for name in ("google", "outlook", "calendly")
        }

    async def find_conflicts(
        self,
        session: AsyncSession,
        *,
        organization_id: str,
        organizer_id: str,
        starts_at: datetime,
        ends_at: datetime,
        participants: list[str],
    ) -> list[Conflict]:
        overlapping = list(
            await session.scalars(
                select(Interview).where(
                    Interview.organization_id == organization_id,
                    Interview.status == "scheduled",
                    Interview.starts_at < ends_at,
                    Interview.ends_at > starts_at,
                )
            )
        )
        requested = {participant.lower() for participant in participants}
        conflicts = [
            Conflict(item.id, item.title, item.starts_at, item.ends_at)
            for item in overlapping
            if item.created_by_id == organizer_id
            or bool(requested & {participant.lower() for participant in item.participants})
        ]
        return conflicts

    async def ensure_available(self, session: AsyncSession, **kwargs: object) -> None:
        conflicts = await self.find_conflicts(session, **kwargs)  # type: ignore[arg-type]
        if conflicts:
            raise SchedulingConflict(conflicts)

    async def create_meeting_link(self, provider: str, interview_id: str) -> str:
        adapter = self.providers.get(provider)
        if adapter is None:
            raise ValueError(f"Unsupported scheduling provider: {provider}")
        return await adapter.create_link(interview_id)


scheduling_service = SchedulingService()
