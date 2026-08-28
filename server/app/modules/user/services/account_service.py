from sqlalchemy.ext.asyncio import AsyncSession

from server.app.core.security.password_service import PasswordService
from server.app.modules.authencation.repository.refresh_token import (
    RefreshTokenReopsitory,
)
from server.app.modules.user.schemas import DeleteAccount
from server.app.modules.user.models.user_model import User
from server.app.modules.user.repository.user_repo import UserRepository


class AccountService:

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repository = UserRepository(session)
        self.refresh_token_repository = RefreshTokenReopsitory(session=session)
        self.password_service = PasswordService()

    async def delete_account(
        self,
        user: User,
        request : DeleteAccount
    ) -> None:
        try:
            # validate user 
            is_valid = self.password_service.verify_password(password=request.password,hash_password=user.password_hash)

            if not is_valid:
                raise ValueError("Incorrect password")
            # Deletion is permanent; revoke sessions before removing the account.
            await self.refresh_token_repository.revoke_all_refresh_token(user.id)
            await self.user_repository.permanent_delete(user)
            await self.session.commit()

        except Exception:
            await self.session.rollback()
            raise

    async def validate_registration_user(
            self,
            user: User | None,
            duplicate_message: str,
        ):
            if user is None:
                return
            raise ValueError(duplicate_message)
