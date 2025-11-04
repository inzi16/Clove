from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ExternalIdentity, Organization, OrganizationMembership, User


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:70] or f"organization-{uuid.uuid4().hex[:8]}"


@dataclass(frozen=True)
class OAuthClaims:
    provider: str
    issuer: str
    subject: str
    email: str
    email_verified: bool
    display_name: str


@dataclass(frozen=True)
class ProvisionedIdentity:
    user: User
    membership: OrganizationMembership
    organization: Organization
    created_user: bool
    created_organization: bool


class OAuthProvisioningError(ValueError):
    pass


class OAuthProvisioningService:
    """Safe OAuth account linking and explicit organization provisioning boundary.

    An email domain is recorded as organization metadata but is never sufficient to
    attach a new identity to an existing tenant. Existing-tenant access requires an
    explicit invite/organization id supplied by trusted server-side flow state.
    """

    async def provision(
        self,
        session: AsyncSession,
        claims: OAuthClaims,
        *,
        invited_organization_id: str | None = None,
        allow_create_organization: bool = False,
        organization_name: str | None = None,
    ) -> ProvisionedIdentity:
        if not claims.email_verified:
            raise OAuthProvisioningError("OAuth provider must return a verified email")

        identity = await session.scalar(
            select(ExternalIdentity).where(
                ExternalIdentity.provider == claims.provider,
                ExternalIdentity.issuer == claims.issuer,
                ExternalIdentity.subject == claims.subject,
            )
        )
        created_user = False
        if identity:
            user = await session.get(User, identity.user_id)
            if user is None or not user.active:
                raise OAuthProvisioningError("Linked user is inactive")
        else:
            user = await session.scalar(select(User).where(User.email == claims.email.lower()))
            if user is None:
                user = User(
                    id=new_id("user"),
                    email=claims.email.lower(),
                    name=claims.display_name,
                    active=True,
                )
                session.add(user)
                created_user = True
            session.add(
                ExternalIdentity(
                    id=new_id("identity"),
                    user_id=user.id,
                    provider=claims.provider,
                    issuer=claims.issuer,
                    subject=claims.subject,
                    email_at_link=claims.email.lower(),
                )
            )

        membership = await session.scalar(
            select(OrganizationMembership)
            .where(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == "active",
            )
            .order_by(OrganizationMembership.is_default.desc(), OrganizationMembership.created_at)
        )
        created_organization = False

        if invited_organization_id:
            organization = await session.get(Organization, invited_organization_id)
            if organization is None or not organization.active:
                raise OAuthProvisioningError("Invited organization does not exist or is inactive")
            invited_membership = await session.scalar(
                select(OrganizationMembership).where(
                    OrganizationMembership.organization_id == organization.id,
                    OrganizationMembership.user_id == user.id,
                )
            )
            if invited_membership is None:
                invited_membership = OrganizationMembership(
                    id=new_id("membership"),
                    organization_id=organization.id,
                    user_id=user.id,
                    role="recruiter",
                    status="active",
                    is_default=membership is None,
                )
                session.add(invited_membership)
            elif invited_membership.status in {"invited", "pending"}:
                # The caller is responsible for validating an unforgeable invite token
                # before passing invited_organization_id into this trusted service boundary.
                invited_membership.status = "active"
                if membership is None:
                    invited_membership.is_default = True
            elif invited_membership.status != "active":
                raise OAuthProvisioningError("Organization membership cannot be activated")
            membership = invited_membership
        elif membership:
            organization = await session.get(Organization, membership.organization_id)
            if organization is None:
                raise OAuthProvisioningError("Membership organization no longer exists")
        elif allow_create_organization:
            domain = claims.email.rpartition("@")[2].lower() or None
            base_name = organization_name or (domain.split(".")[0].title() if domain else "My team")
            organization = Organization(
                id=new_id("org"),
                name=base_name,
                slug=f"{slugify(base_name)}-{uuid.uuid4().hex[:6]}",
                # A verified OAuth email proves control of one mailbox, not control of
                # its domain. DNS/admin verification must populate this separately.
                verified_domain=None,
                active=True,
            )
            membership = OrganizationMembership(
                id=new_id("membership"),
                organization_id=organization.id,
                user_id=user.id,
                role="admin",
                status="active",
                is_default=True,
            )
            session.add_all([organization, membership])
            created_organization = True
        else:
            raise OAuthProvisioningError("No organization invite or provisioning permission")

        await session.commit()
        return ProvisionedIdentity(
            user=user,
            membership=membership,
            organization=organization,
            created_user=created_user,
            created_organization=created_organization,
        )
