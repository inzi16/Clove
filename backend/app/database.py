from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


class Database:
    """Owns an async engine and session factory for one application instance."""

    def __init__(self, url: str, *, echo: bool = False) -> None:
        engine_kwargs: dict[str, object] = {"echo": echo, "pool_pre_ping": True}
        if url in {"sqlite+aiosqlite://", "sqlite+aiosqlite:///:memory:"}:
            engine_kwargs["poolclass"] = StaticPool
            engine_kwargs["connect_args"] = {"check_same_thread": False}

        self.engine: AsyncEngine = create_async_engine(url, **engine_kwargs)
        self.session_maker = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

        if url.startswith("sqlite"):
            self._configure_sqlite()

    def _configure_sqlite(self) -> None:
        @event.listens_for(self.engine.sync_engine, "connect")
        def set_sqlite_pragma(dbapi_connection: object, _: object) -> None:
            cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    async def create_schema(self) -> None:
        # Importing models registers all tables on Base.metadata.
        from app import models  # noqa: F401

        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def dispose(self) -> None:
        await self.engine.dispose()

    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self.session_maker() as session:
            yield session
