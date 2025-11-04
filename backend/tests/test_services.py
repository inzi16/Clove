from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.config import Settings
from app.services.oauth import OAuthClaims, OAuthProvisioningError, OAuthProvisioningService
from app.services.scoring import (
    CandidateScorer,
    FeatureHashEmbeddingProvider,
    cosine_similarity,
    deterministic_embedding,
)
from app.models import (
    Base,
    ENTITY_ID_LENGTH,
    ExternalIdentity,
    OrganizationMembership,
    User,
)
from app.services.vector_search import LocalCosineVectorStore, MilvusVectorStore, VectorDocument
from app.services.webhooks import WebhookIdempotencyService


def test_candidate_scoring_is_deterministic_weighted_and_auditable():
    job = SimpleNamespace(
        title="Backend Engineer",
        description="Build Python FastAPI services on PostgreSQL",
        location="Bengaluru, India",
        remote_policy="hybrid",
        required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        preferred_skills=["AWS"],
        min_experience_years=5,
    )
    strong = SimpleNamespace(
        headline="Senior Python backend engineer",
        summary="Builds FastAPI and PostgreSQL systems",
        location="Bengaluru, India",
        skills=["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
        experience_years=6,
    )
    weak = SimpleNamespace(
        headline="Junior visual designer",
        summary="Creates brand illustrations",
        location="Paris, France",
        skills=["Illustrator"],
        experience_years=1,
    )
    scorer = CandidateScorer(dimensions=96)
    first = scorer.score(strong, job)
    second = scorer.score(strong, job)
    weak_result = scorer.score(weak, job)

    assert first == second
    assert first.total > weak_result.total
    assert first.breakdown["weights"] == {
        "semantic": 0.25,
        "skills": 0.4,
        "experience": 0.25,
        "location": 0.1,
    }
    assert first.evidence["matched_required_skills"] == [
        "docker",
        "fastapi",
        "postgresql",
        "python",
    ]
    assert first.version == "deterministic-v1"


def test_feature_hash_embedding_is_stable_zero_config_fallback():
    first = deterministic_embedding("Python FastAPI PostgreSQL", 96)
    second = deterministic_embedding("Python FastAPI PostgreSQL", 96)
    different = deterministic_embedding("Figma product design", 96)
    assert first == second
    assert len(first) == 96
    assert cosine_similarity(first, first) == pytest.approx(1)
    assert cosine_similarity(first, different) < 1


def test_all_entity_primary_and_foreign_key_columns_use_safe_id_length():
    primary_keys = {
        table.name: next(iter(table.primary_key.columns)) for table in Base.metadata.sorted_tables
    }
    assert primary_keys
    for column in primary_keys.values():
        assert getattr(column.type, "length", None) == ENTITY_ID_LENGTH
    for table in Base.metadata.sorted_tables:
        for column in table.columns:
            if column.foreign_keys:
                referenced = next(iter(column.foreign_keys)).column
                if referenced.primary_key:
                    assert getattr(column.type, "length", None) == ENTITY_ID_LENGTH


def test_app_env_alias_drives_environment_hardening():
    assert Settings(APP_ENV="production").environment == "production"


@pytest.mark.asyncio
async def test_local_vector_store_rechecks_tenant_boundary():
    provider = FeatureHashEmbeddingProvider(96)
    store = LocalCosineVectorStore(provider)
    documents = [
        VectorDocument("candidate-a", "org-a", provider.embed("Python API backend")),
        VectorDocument("candidate-b", "org-b", provider.embed("Python API backend")),
    ]
    hits = await store.search(
        query="Python backend", organization_id="org-a", documents=documents, limit=10
    )
    assert [hit.candidate_id for hit in hits] == ["candidate-a"]


@pytest.mark.asyncio
async def test_milvus_filter_enforces_org_and_supplied_candidate_scope():
    class FakeMilvusClient:
        def __init__(self) -> None:
            self.search_filter = ""
            self.upserted = []

        def has_collection(self, **_: object) -> bool:
            return True

        def upsert(self, *, data, **_: object) -> None:
            self.upserted = data

        def search(self, *, filter: str, **_: object):
            self.search_filter = filter
            # A defensive post-filter must discard a result not in the supplied scope.
            return [[
                {"entity": {"candidate_id": "candidate-a"}, "distance": 0.91},
                {"entity": {"candidate_id": "candidate-outside"}, "distance": 0.99},
            ]]

    provider = FeatureHashEmbeddingProvider(96)
    store = object.__new__(MilvusVectorStore)
    store.embedding_provider = provider
    store.collection = "test_candidates"
    store.client = FakeMilvusClient()
    documents = [
        VectorDocument("candidate-a", "org-a", provider.embed("Python backend")),
        VectorDocument('candidate-"quoted', "org-a", provider.embed("Product design")),
        VectorDocument("candidate-outside", "org-b", provider.embed("Python backend")),
    ]

    hits = await store.search(
        query="Python", organization_id="org-a", documents=documents, limit=10
    )
    assert [hit.candidate_id for hit in hits] == ["candidate-a"]
    assert 'organization_id == "org-a"' in store.client.search_filter
    assert 'candidate_id in ["candidate-\\"quoted", "candidate-a"]' in store.client.search_filter
    assert "candidate-outside" not in store.client.search_filter
    assert {record["organization_id"] for record in store.client.upserted} == {"org-a"}


@pytest.mark.asyncio
async def test_oauth_provisioning_uses_issuer_subject_and_explicit_org_authority(app):
    service = OAuthProvisioningService()
    claims = OAuthClaims(
        provider="google",
        issuer="https://accounts.google.com",
        subject="google-subject-123",
        email="new.owner@example.org",
        email_verified=True,
        display_name="New Owner",
    )
    async with app.state.database.session_maker() as session:
        with pytest.raises(OAuthProvisioningError):
            await service.provision(session, claims)
        await session.rollback()

        provisioned = await service.provision(
            session,
            claims,
            allow_create_organization=True,
            organization_name="Example Org",
        )
        assert provisioned.created_user is True
        assert provisioned.created_organization is True
        assert provisioned.membership.role == "admin"
        assert len(provisioned.user.id) <= ENTITY_ID_LENGTH
        assert len(provisioned.membership.id) <= ENTITY_ID_LENGTH
        identity = await session.scalar(
            select(ExternalIdentity).where(ExternalIdentity.user_id == provisioned.user.id)
        )
        assert identity is not None
        assert len(identity.id) <= ENTITY_ID_LENGTH

        repeated = await service.provision(session, claims)
        assert repeated.user.id == provisioned.user.id
        assert repeated.organization.id == provisioned.organization.id
        assert repeated.created_user is False


@pytest.mark.asyncio
async def test_oauth_public_email_domain_is_not_marked_verified(app):
    service = OAuthProvisioningService()
    claims = OAuthClaims(
        provider="google",
        issuer="https://accounts.google.com",
        subject="public-email-subject",
        email="founder.demo@gmail.com",
        email_verified=True,
        display_name="Demo Founder",
    )
    async with app.state.database.session_maker() as session:
        provisioned = await service.provision(
            session,
            claims,
            allow_create_organization=True,
            organization_name="Mailbox Signup Org",
        )
        assert provisioned.organization.verified_domain is None
        assert provisioned.membership.status == "active"


@pytest.mark.asyncio
async def test_oauth_trusted_invite_activates_existing_membership(app):
    service = OAuthProvisioningService()
    invited_user = User(
        id="user-pending-invite",
        email="pending.invite@example.com",
        name="Pending Invite",
    )
    invited_membership = OrganizationMembership(
        id="membership-pending-invite",
        organization_id="org_northstar",
        user_id=invited_user.id,
        role="recruiter",
        status="invited",
        is_default=False,
    )
    claims = OAuthClaims(
        provider="azure",
        issuer="https://login.microsoftonline.com/tenant-id/v2.0",
        subject="azure-invited-subject",
        email=invited_user.email,
        email_verified=True,
        display_name=invited_user.name,
    )
    async with app.state.database.session_maker() as session:
        session.add_all([invited_user, invited_membership])
        await session.commit()

        provisioned = await service.provision(
            session,
            claims,
            invited_organization_id="org_northstar",
        )
        assert provisioned.membership.id == invited_membership.id
        assert provisioned.membership.status == "active"
        assert provisioned.membership.is_default is True
        await session.refresh(invited_membership)
        assert invited_membership.status == "active"


@pytest.mark.asyncio
async def test_webhook_claim_is_idempotent(app):
    service = WebhookIdempotencyService()
    async with app.state.database.session_maker() as session:
        first = await service.claim(
            session,
            organization_id="org_northstar",
            provider="stripe",
            event_id="evt_test_unique",
            payload={"type": "customer.subscription.updated", "value": 1},
        )
        second = await service.claim(
            session,
            organization_id="org_northstar",
            provider="stripe",
            event_id="evt_test_unique",
            payload={"type": "customer.subscription.updated", "value": 1},
        )
        assert first.should_process is True
        assert second.should_process is False
        assert first.receipt.id == second.receipt.id
