# Users API routes for WasteWise.
from fastapi import APIRouter,Depends,status
from sqlalchemy.ext.asyncio import AsyncSession


from app.modules.user.services.account_service import AccountService

# from app.modules.user.repository.user_repo import UserRepository
from app.database.database import get_db

from app.core.dependencies import get_current_user
from app.modules.user.models.user_model import User
from app.modules.user.schemas import DeleteAccount

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
