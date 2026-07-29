from app.database.base import Base

__all__ = ["Base"]


def get_db_session():
    from app.database.session import get_db_session as _get_db_session
    return _get_db_session()
