from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.repository import BaseRepository
from app.modules.authencation.models.email_verification import EmailVerification


class EmailVerificationReopsitory(BaseRepository[EmailVerification]):
    def __init__(self, session:AsyncSession):
        super().__init__(session)


    async def create_email_verification(
        self,
        request:EmailVerification
    )->EmailVerification:
        return await self.add(request)

    async def invalidate_active_tokens(self, user_id) -> None:
        # CHANGE: a resend supersedes every previous unused verification link.
        stmt = select(EmailVerification).where(
            EmailVerification.user_id == user_id,
            EmailVerification.verified_at.is_(None),
        )
        for token in (await self.session.scalars(stmt)).all():
            token.verified_at = datetime.now(timezone.utc)
        await self.session.flush()
    
    async def get_vaild_email_verification_token(
        self,
        token:str
    )->EmailVerification|None:
        stmt = (
            select(EmailVerification).where(
                EmailVerification.token_hash == token,
                EmailVerification.verified_at.is_(None),
                EmailVerification.expires_at > datetime.now(timezone.utc)
            )
        )

        return await self.session.scalar(stmt)
    
    async def mark_emial_verified(
        self,
        request:EmailVerification
    )->EmailVerification:
        request.verified_at = datetime.now(timezone.utc)
        await self.session.flush()

        return request
    

