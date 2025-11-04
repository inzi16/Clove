from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status

from app.models import OrganizationMembership, Subscription


PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "starter": {"active_jobs": 3, "candidates_per_month": 100, "seats": 3},
    "growth": {"active_jobs": 25, "candidates_per_month": 2500, "seats": 15},
    "enterprise": {"active_jobs": None, "candidates_per_month": None, "seats": None},
}


@dataclass(frozen=True)
class BillingAccess:
    tier: str
    features: frozenset[str]
    limits: dict[str, int | None]


class BillingAuthorizationService:
    """Centralizes Stripe-derived entitlements and tenant role checks."""

    def access(self, subscription: Subscription) -> BillingAccess:
        features = frozenset(subscription.features if subscription.status == "active" else [])
        return BillingAccess(
            tier=subscription.tier,
            features=features,
            limits=PLAN_LIMITS.get(subscription.tier, PLAN_LIMITS["starter"]).copy(),
        )

    def require_feature(self, subscription: Subscription, feature: str) -> None:
        if feature not in self.access(subscription).features:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={"code": "feature_not_available", "message": f"'{feature}' is not enabled"},
            )

    def require_admin(self, membership: OrganizationMembership) -> None:
        if membership.role not in {"owner", "admin"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "admin_required", "message": "Organization admin access required"},
            )


billing_authorization = BillingAuthorizationService()
