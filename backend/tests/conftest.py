from __future__ import annotations

from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.main import create_app


@pytest_asyncio.fixture
async def app():
    settings = Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        environment="test",
        debug=False,
        seed_demo_data=True,
        dev_user_id="demo-user",
        milvus_enabled=False,
    )
    application = create_app(settings)
    async with application.router.lifespan_context(application):
        yield application


@pytest_asyncio.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
