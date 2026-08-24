from typing import Generic,TypeVar
from sqlalchemy.ext.asyncio import AsyncSession


ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    def __init__(self,session:AsyncSession):
        self.session=session

    async def add(
        self,
        instance:ModelType,
    )->ModelType:
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance=instance)
        return instance
    
    async def delete(
        self,
        instance:ModelType,
    )->None:
        await self.session.delete(instance=instance)
        await self.session.flush()

    async def refresh(self, instance: ModelType) -> None:
        await self.session.refresh(instance)

    async def flush(self) -> None:
        await self.session.flush()

    async def save(self, instance: ModelType) -> ModelType:
        await self.session.flush()
        await self.session.refresh(instance)
        return instance
