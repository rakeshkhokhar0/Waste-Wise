from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.database.repository import BaseRepository
from server.app.modules.authencation.models.refresh_token import RefreshToken


class RefreshTokenReopsitory(BaseRepository[RefreshToken]):
    def __init__(self, session:AsyncSession):
        super().__init__(session=session)
        
    async def create_refresh_token(
        self,
        token:RefreshToken
    )->RefreshToken:
        return await self.add(token)
    
    async def get_token(
        self,
        token_hash:str
    )->RefreshToken|None:
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash==token_hash,
            RefreshToken.expires_at > datetime.now(timezone.utc),
            RefreshToken.revoked_at.is_(None)
        )

        return await self.session.scalar(statement=stmt)
    
    async def revoke_refresh_token(
        self,
        refresh_token:RefreshToken
    )->None:
        refresh_token.revoked_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def revoke_all_refresh_token(
        self,
        user_id:UUID
    )->None:
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None)
        )

        tokens =(await self.session.scalars(stmt)).all()
        now = datetime.now(timezone.utc)

        for token in tokens:
            token.revoked_at = now

        await self.session.flush()


        
    

    