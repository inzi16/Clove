from __future__ import annotations

import asyncio
import hashlib
from dataclasses import dataclass
from typing import Protocol, Sequence

from app.config import Settings
from app.services.scoring import (
    EmbeddingProvider,
    FeatureHashEmbeddingProvider,
    cosine_similarity,
)


@dataclass(frozen=True)
class VectorDocument:
    candidate_id: str
    organization_id: str
    embedding: Sequence[float]


@dataclass(frozen=True)
class VectorHit:
    candidate_id: str
    similarity: float


class VectorStore(Protocol):
    backend_name: str

    async def search(
        self,
        *,
        query: str,
        organization_id: str,
        documents: Sequence[VectorDocument],
        limit: int,
    ) -> list[VectorHit]: ...

    async def delete_candidate(self, *, organization_id: str, candidate_id: str) -> None: ...


class LocalCosineVectorStore:
    backend_name = "local-cosine"

    def __init__(self, embedding_provider: EmbeddingProvider) -> None:
        self.embedding_provider = embedding_provider

    async def search(
        self,
        *,
        query: str,
        organization_id: str,
        documents: Sequence[VectorDocument],
        limit: int,
    ) -> list[VectorHit]:
        query_vector = self.embedding_provider.embed(query)
        hits = [
            VectorHit(document.candidate_id, cosine_similarity(query_vector, document.embedding))
            for document in documents
            if document.organization_id == organization_id
        ]
        return sorted(hits, key=lambda hit: (-hit.similarity, hit.candidate_id))[:limit]

    async def delete_candidate(self, *, organization_id: str, candidate_id: str) -> None:
        # Local vectors are stored with the SQL candidate and disappear in that transaction.
        return None


class MilvusVectorStore:
    """Thin optional adapter; tenant filtering is mandatory in every Milvus query."""

    backend_name = "milvus"

    def __init__(self, settings: Settings, embedding_provider: EmbeddingProvider) -> None:
        try:
            from pymilvus import MilvusClient
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError("Install the 'milvus' extra to enable Milvus") from exc

        self.embedding_provider = embedding_provider
        self.collection = settings.milvus_collection
        self.client = MilvusClient(uri=settings.milvus_uri, token=settings.milvus_token or "")

    async def search(
        self,
        *,
        query: str,
        organization_id: str,
        documents: Sequence[VectorDocument],
        limit: int,
    ) -> list[VectorHit]:
        query_vector = self.embedding_provider.embed(query)
        tenant_documents = [doc for doc in documents if doc.organization_id == organization_id]
        if not tenant_documents:
            return []
        allowed_candidate_ids = sorted({doc.candidate_id for doc in tenant_documents})
        allowed_candidate_id_set = set(allowed_candidate_ids)

        def run() -> list[VectorHit]:
            if not self.client.has_collection(collection_name=self.collection):
                # MilvusClient's quick-create path enables dynamic metadata fields;
                # production deployments can replace this with a migration-managed schema.
                self.client.create_collection(
                    collection_name=self.collection,
                    dimension=self.embedding_provider.dimensions,
                    metric_type="COSINE",
                    consistency_level="Strong",
                )
            records = [
                {
                    "id": self._vector_id(doc.organization_id, doc.candidate_id),
                    "vector": list(doc.embedding),
                    "candidate_id": doc.candidate_id,
                    "organization_id": doc.organization_id,
                }
                for doc in tenant_documents
            ]
            self.client.upsert(collection_name=self.collection, data=records)
            result = self.client.search(
                collection_name=self.collection,
                data=[query_vector],
                filter=self._scope_filter(organization_id, allowed_candidate_ids),
                limit=limit,
                output_fields=["candidate_id"],
            )
            return [
                VectorHit(
                    str(hit["entity"]["candidate_id"]),
                    max(0.0, min(1.0, float(hit["distance"]))),
                )
                for hit in result[0]
                if str(hit["entity"]["candidate_id"]) in allowed_candidate_id_set
            ]

        return await asyncio.to_thread(run)

    async def delete_candidate(self, *, organization_id: str, candidate_id: str) -> None:
        """Idempotent reconciliation hook for SQL deletion/outbox workers."""

        vector_id = self._vector_id(organization_id, candidate_id)

        def run() -> None:
            if self.client.has_collection(collection_name=self.collection):
                # Both the deterministic primary key and tenant predicate protect against
                # cross-tenant deletion if candidate id conventions later change.
                self.client.delete(
                    collection_name=self.collection,
                    filter=(
                        f'id == {vector_id} and '
                        f'organization_id == {self._string_literal(organization_id)}'
                    ),
                )

        await asyncio.to_thread(run)

    @staticmethod
    def _vector_id(organization_id: str, candidate_id: str) -> int:
        digest = hashlib.blake2b(
            f"{organization_id}:{candidate_id}".encode("utf-8"), digest_size=8
        ).digest()
        return int.from_bytes(digest, "big") & ((1 << 63) - 1)

    @staticmethod
    def _string_literal(value: str) -> str:
        """Quote a Milvus expression string without allowing filter injection."""
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'

    @classmethod
    def _scope_filter(cls, organization_id: str, candidate_ids: Sequence[str]) -> str:
        candidate_literals = ", ".join(cls._string_literal(value) for value in candidate_ids)
        return (
            f"organization_id == {cls._string_literal(organization_id)} and "
            f"candidate_id in [{candidate_literals}]"
        )


class FallbackVectorStore:
    """Uses Milvus when healthy and degrades to deterministic local search."""

    def __init__(self, primary: VectorStore, fallback: VectorStore) -> None:
        self.primary = primary
        self.fallback = fallback
        self.backend_name = f"{primary.backend_name}-with-{fallback.backend_name}-fallback"

    async def search(self, **kwargs: object) -> list[VectorHit]:
        try:
            return await self.primary.search(**kwargs)  # type: ignore[arg-type]
        except Exception:
            return await self.fallback.search(**kwargs)  # type: ignore[arg-type]

    async def delete_candidate(self, *, organization_id: str, candidate_id: str) -> None:
        try:
            await self.primary.delete_candidate(
                organization_id=organization_id, candidate_id=candidate_id
            )
        except Exception:
            # A durable outbox/retry worker should call this boundary in production.
            await self.fallback.delete_candidate(
                organization_id=organization_id, candidate_id=candidate_id
            )


def create_vector_store(
    settings: Settings, embedding_provider: EmbeddingProvider | None = None
) -> VectorStore:
    # Inject a model-backed provider here in production; feature hashing keeps local
    # development deterministic and dependency-free but is not a semantic model.
    provider = embedding_provider or FeatureHashEmbeddingProvider(settings.embedding_dimensions)
    local = LocalCosineVectorStore(provider)
    if not settings.milvus_enabled:
        return local
    try:
        return FallbackVectorStore(MilvusVectorStore(settings, provider), local)
    except RuntimeError:
        return local
