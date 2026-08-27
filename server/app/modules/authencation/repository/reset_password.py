from datetime import datetime,timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.authencation.models.reset_password import ResetPassword
from app.database.repository import BaseRepository

class ResetPasswordReopsitory(BaseRepository[ResetPassword]):
    def __init__(self, session:AsyncSession):
        super().__init__(session)

    async def create_reset_password(
        self,
        request:ResetPassword
    )->ResetPassword:
        return await self.add(request)

    async def invalidate_active_tokens(self, user_id) -> None:
        # CHANGE: only the most recently issued password-reset link may be used.
        stmt = select(ResetPassword).where(
            ResetPassword.user_id == user_id,
            ResetPassword.used_at.is_(None),
        )
        for token in (await self.session.scalars(stmt)).all():
            token.used_at = datetime.now(timezone.utc)
        await self.session.flush()
    

    async def get_reset_password(
        self,
        token_hash:str
    )->ResetPassword|None:
        stmt = (
            select(ResetPassword).where(
                ResetPassword.token_hash == token_hash,
                ResetPassword.used_at.is_(None),
                ResetPassword.expires_at > datetime.now(timezone.utc)
            )
        )

        return await self.session.scalar(stmt)
    
    async def mark_reset_password_used(
        self,
        request:ResetPassword
    )->ResetPassword:
        request.used_at = datetime.now(timezone.utc)

        await self.session.flush()

        return request
