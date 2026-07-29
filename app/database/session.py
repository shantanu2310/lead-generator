from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.logging import get_logger

logger = get_logger()

_engine = None
_session_factory = None


def _get_engine():
    global _engine
    if _engine is None:
        try:
            _engine = create_async_engine(
                settings.database_url,
                echo=False,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
            )
        except Exception as e:
            logger.warning("database_engine_failed", error=str(e))
            return None
    return _engine


def _get_session_factory():
    global _session_factory
    if _session_factory is None:
        engine = _get_engine()
        if engine is None:
            return None
        _session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    factory = _get_session_factory()
    if factory is None:
        raise RuntimeError("Database not available")
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
