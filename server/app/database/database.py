# Database connection helpers for the WasteWise backend.
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import Base
from app.database.session import AsyncSessionLocal,engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables()->None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db()->None:
    await engine.dispose()
