from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.auth.dependencies import get_current_user
from api.config import get_settings
from api.dependencies.database import get_reader
from api.rbac.models import User
from api.routers import auth, chamados, dashboard, export, meta, users
from api.schemas.auth import AuthCheckResponse, UserResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    reader = get_reader(settings)
    reader.connect()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(chamados.router)
    app.include_router(dashboard.router)
    app.include_router(export.router)
    app.include_router(meta.router)
    app.include_router(users.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/v1/auth", response_model=AuthCheckResponse)
    def auth_check(user: Annotated[User, Depends(get_current_user)]) -> AuthCheckResponse:
        return AuthCheckResponse(
            authenticated=True,
            user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role.value),
        )

    return app


app = create_app()
