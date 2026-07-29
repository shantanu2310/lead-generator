import uvicorn

from app.config import settings


def main():
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.app_debug,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
