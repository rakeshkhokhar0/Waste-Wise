from fastapi import APIRouter

from server.app.modules.authencation.router import router as auth_router
from server.app.modules.user.router import router as user_router
from server.app.modules.waste.router import router as waste_router


api_router = APIRouter(
    prefix="/api/v1"
)


# Authentication routes
api_router.include_router(auth_router)

# User routes
api_router.include_router(user_router)

# Waste routes
api_router.include_router(waste_router)