from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app.db.base  # noqa: F401
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError, UnauthorizedError

# Importing app.db.base registers every ORM mapper at startup so relationships
# resolve before the first query, even for modules not imported by a router.

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "JanuszTrans MVP — a single-company platform for van rental (Self Drive), "
        "transport with a driver (Van + Driver) and full moving services."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    headers = {"WWW-Authenticate": "Bearer"} if isinstance(exc, UnauthorizedError) else None
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
