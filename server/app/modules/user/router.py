# Users API routes for WasteWise.
from fastapi import APIRouter,Depends,status
from sqlalchemy.ext.asyncio import AsyncSession


from server.app.modules.user.services.account_service import AccountService

# from server.app.modules.user.repository.user_repo import UserRepository
from server.app.database.database import get_db

from server.app.core.dependencies import get_current_user
from server.app.modules.user.models.user_model import User
from server.app.modules.user.schemas import DeleteAccount

router = APIRouter(
    prefix="/users",
    tags=["users",],
)

def get_account_services(
    session :AsyncSession = Depends(get_db)
)->AccountService:
    return AccountService(
        session=session
    )

# @router.get("/me", response_model=UserResponse)
# async def get_me(current_user: User = Depends(get_current_user)):
#     return current_user

@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_account(
    request : DeleteAccount,
    current_user: User = Depends(get_current_user),
    service : AccountService = Depends(get_account_services),
):

    await service.delete_account(current_user,request)
