from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import Settings, get_settings
from app.database import Database
from app.seed import seed_demo_data
from app.services.scoring import EmbeddingProvider
from app.services.vector_search import create_vector_store


def create_app(
    settings: Settings | None = None,
    *,
    embedding_provider: EmbeddingProvider | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    database = Database(resolved_settings.database_url, echo=resolved_settings.debug)
    vector_store = create_vector_store(resolved_settings, embedding_provider)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await database.create_schema()
        if resolved_settings.seed_demo_data:
            async with database.session_maker() as session:
                await seed_demo_data(session, resolved_settings, embedding_provider)
        yield
        await database.dispose()

    application = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description=(
            "Multi-tenant recruitment API with explainable candidate scoring, "
            "pipeline management, scheduling, billing, and vector-search boundaries."
        ),
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    application.state.database = database
    application.state.vector_store = vector_store
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(router, prefix=resolved_settings.api_prefix)

    @application.get("/health", include_in_schema=False)
    async def unprefixed_health(request: Request) -> dict[str, str]:
        """Container-orchestrator alias; the public API also exposes /api/health."""
        database_name = (
            "postgresql" if resolved_settings.database_url.startswith("postgresql") else "sqlite"
        )
        return {
            "status": "ok",
            "service": resolved_settings.app_name,
            "version": "0.1.0",
            "environment": resolved_settings.environment,
            "database": database_name,
            "vector_search": request.app.state.vector_store.backend_name,
        }

    return application


app = create_app()
