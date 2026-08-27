from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import appsetting
from app.database.database import close_db, create_tables

from app.modules.authencation.models.email_verification import EmailVerification
from app.modules.authencation.models.refresh_token import RefreshToken
from app.modules.authencation.models.reset_password import ResetPassword
from app.modules.user.models.user_model import User


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield
    await close_db()


app = FastAPI(
    title=appsetting.APP_NAME,
    version=str(appsetting.APP_VERSION),
    debug=appsetting.DEBUG,
    lifespan=lifespan,
)


@app.exception_handler(ValueError)
async def value_error_handler(
    _: Request,
    exc: ValueError,
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in appsetting.CORS_ORIGINS.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    return {
        "application": appsetting.APP_NAME,
        "version": appsetting.APP_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
    }


app.include_router(api_router)
