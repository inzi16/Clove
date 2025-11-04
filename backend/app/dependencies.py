from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import Organization, OrganizationMembership, User
from app.services.vector_search import VectorStore


@dataclass(frozen=True)
class TenantContext:
    user: User
    membership: OrganizationMembership
    organization: Organization

    @property
    def organization_id(self) -> str:
        return self.organization.id


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.database.session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_vector_store(request: Request) -> VectorStore:
    return request.app.state.vector_store


async def get_tenant_context(
    session: SessionDep,
    settings: Annotated[Settings, Depends(get_app_settings)],
    user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> TenantContext:
    """Resolve tenant exclusively from server-side identity membership.

    ``X-User-Id`` is a development authentication shim, not a production auth
    protocol. There is intentionally no organization header to spoof.
    """

    environment = settings.environment.strip().lower()
    if environment not in {"local", "development", "test"}:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "authentication_not_configured",
                "message": (
                    "The X-User-Id development identity shim is disabled outside "
                    "local, development, and test environments"
                ),
            },
        )

    resolved_user_id = user_id or settings.dev_user_id
    row = (
        await session.execute(
            select(User, OrganizationMembership, Organization)
            .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
            .join(Organization, Organization.id == OrganizationMembership.organization_id)
            .where(
                User.id == resolved_user_id,
                User.active.is_(True),
                OrganizationMembership.status == "active",
                Organization.active.is_(True),
            )
            .order_by(
                OrganizationMembership.is_default.desc(), OrganizationMembership.created_at.asc()
            )
            .limit(1)
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_identity", "message": "Unknown or inactive development user"},
        )
    user, membership, organization = row
    return TenantContext(user=user, membership=membership, organization=organization)


TenantDep = Annotated[TenantContext, Depends(get_tenant_context)]
VectorStoreDep = Annotated[VectorStore, Depends(get_vector_store)]
