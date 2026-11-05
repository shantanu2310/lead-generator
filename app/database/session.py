# from collections.abc import AsyncGenerator

# from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# from app.config import settings
# from app.core.logging import get_logger

# logger = get_logger()

# _engine = None
# _session_factory = None


# def _get_engine():
#     global _engine
#     if _engine is None:
#         try:
#             url = settings.database_url
#             is_sqlite = url.startswith("sqlite")
#             connect_args = {}
#             if is_sqlite:
#                 connect_args["check_same_thread"] = False
#             _engine = create_async_engine(
#                 url,
#                 echo=False,
#                 pool_pre_ping=not is_sqlite,
#                 connect_args=connect_args if is_sqlite else {},
#             )
#         except Exception as e:
#             logger.warning("database_engine_failed", error=str(e))
#             return None
#     return _engine


# def _get_session_factory():
#     global _session_factory
#     if _session_factory is None:
#         engine = _get_engine()
#         if engine is None:
#             return None
#         _session_factory = async_sessionmaker(
#             engine,
#             class_=AsyncSession,
#             expire_on_commit=False,
#         )
#     return _session_factory


# async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
#     factory = _get_session_factory()
#     if factory is None:
#         raise RuntimeError("Database not available")
#     async with factory() as session:
#         try:
#             yield session
#             await session.commit()
#         except Exception:
#             await session.rollback()
#             raise
# //above old one 




from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.core.logging import get_logger

logger = get_logger()

_engine = None
_session_factory = None


def _get_engine():
    global _engine

    if _engine is not None:
        return _engine

    try:
        url = settings.database_url

        if not url:
            raise RuntimeError("DATABASE_URL is not configured")

        # Convert PostgreSQL URL to asyncpg format.
        # Railway's original DATABASE_URL remains unchanged.
        if url.startswith("postgres://"):
            url = url.replace(
                "postgres://",
                "postgresql+asyncpg://",
                1,
            )

        elif url.startswith("postgresql://"):
            url = url.replace(
                "postgresql://",
                "postgresql+asyncpg://",
                1,
            )

        is_sqlite = url.startswith("sqlite")

        connect_args = {}

        if is_sqlite:
            connect_args["check_same_thread"] = False

        _engine = create_async_engine(
            url,
            echo=False,
            pool_pre_ping=not is_sqlite,
            connect_args=connect_args,
        )

        logger.info("database_engine_initialized")

        return _engine

    except Exception as e:
        logger.error(
            "database_engine_failed",
            error=str(e),
        )
        raise


def _get_session_factory():
    global _session_factory

    if _session_factory is None:
        engine = _get_engine()

        _session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    factory = _get_session_factory()

    async with factory() as session:
        try:
            yield session
            await session.commit()

        except Exception:
            await session.rollback()
            raise
