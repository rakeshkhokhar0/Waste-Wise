from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.repository import BaseRepository
from app.modules.user.models.user_model import User


class UserRepository(BaseRepository[User]):
    def __init__(self, session:AsyncSession):
        super().__init__(session)


    async def create_user(
        self,
        request:User
    )->User:
        return await self.add(request)
    
    async def get_user_by_id(
        self,
        user_id:UUID
    )->User|None:
        stmt = select(User).where(User.id == user_id)

        return await self.session.scalar(stmt)

    async def get_user_by_identifier(
        self,
        identifier:str
    )->User|None:
        stmt = (
            select(User).where(
                or_(
                    User.email == identifier,
                    User.user_name == identifier
                )
            )
        )

        return await self.session.scalar(stmt)
    
    # async def get_user_by_username(
    #     self,
    #     username:str
    # )->User:
    #     stmt = (
    #         select(User).where(User.user_name == username)
    #     )

    #     return await self.session.scalar(stmt)
    
    async def update_username(
        self,
        user:User,
        new_user_name:str
    )->User:
        user.user_name = new_user_name
        await self.session.flush()

        return user
    
    async def update_password(
        self,
        user:User,
        password_hash:str
    )->User:
        user.password_hash = password_hash
        await self.flush()

        return user

    async def update_last_login(
        self,
        user:User
    )->User:
        user.last_login_at = datetime.now(timezone.utc)
        await self.session.flush()

        return user
    
    async def update(
        self,
        user:User
    )->User:
        await self.session.flush()

        await self.session.refresh(user)

        return user

    async def mark_email_verified(
        self,
        user:User
    )->User:
        user.is_verified = True
        await self.session.flush()
        return user
    
    async def permanent_delete(
        self,
        user:User
    ):
        await self.delete(instance=user)
