from sqlalchemy.ext.asyncio import AsyncEngine,AsyncSession,async_sessionmaker,create_async_engine
from app.core.config import databasesetting


engine = create_async_engine(
    url=databasesetting.DATABASE_URL,
    echo=databasesetting.DB_ECHO,
    # CHANGE: apply the configured pool controls; they were defined but unused.
    pool_size=databasesetting.DB_POOL_SIZE,
    max_overflow=databasesetting.DB_MAX_OVERFLOW,
    pool_timeout=databasesetting.DB_POOL_TIMEOUT,
    pool_recycle=databasesetting.DB_POOL_RECYCLE,
    pool_pre_ping=databasesetting.DB_POOL_PRE_PING,
)


# CHANGE: the session factory produces AsyncSession instances, not AsyncEngine.
AsyncSessionLocal:async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession
)

