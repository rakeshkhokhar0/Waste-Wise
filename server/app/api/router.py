from fastapi import APIRouter

from server.app.modules.authencation.router import router as auth_router
from server.app.modules.user.router import router as user_router

api_router = APIRouter(
    prefix="/api/v1"
)

api_router.include_router(auth_router)
api_router.include_router(user_router)