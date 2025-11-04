from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models import WebhookReceipt


@dataclass(frozen=True)
class WebhookClaim:
    receipt: WebhookReceipt
    should_process: bool


class WebhookIdempotencyService:
    """Claim boundary to call only after provider signature verification.

    Provider-specific HTTP adapters should verify signatures, resolve the tenant from
    server-owned integration metadata, claim the event, and acknowledge duplicates.
    """

    async def claim(
        self,
        session: AsyncSession,
        *,
        organization_id: str,
        provider: str,
        event_id: str,
        payload: dict[str, Any],
    ) -> WebhookClaim:
        existing = await session.scalar(
            select(WebhookReceipt).where(
                WebhookReceipt.provider == provider, WebhookReceipt.event_id == event_id
            )
        )
        if existing:
            return WebhookClaim(existing, False)

        payload_hash = hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        receipt = WebhookReceipt(
            id=f"webhook_{uuid.uuid4().hex}",
            organization_id=organization_id,
            provider=provider,
            event_id=event_id,
            payload_hash=payload_hash,
            status="processing",
        )
        try:
            async with session.begin_nested():
                session.add(receipt)
                await session.flush()
        except IntegrityError:
            existing = await session.scalar(
                select(WebhookReceipt).where(
                    WebhookReceipt.provider == provider, WebhookReceipt.event_id == event_id
                )
            )
            if existing is None:
                raise
            return WebhookClaim(existing, False)
        return WebhookClaim(receipt, True)


webhook_idempotency = WebhookIdempotencyService()
