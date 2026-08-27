from logging.config import fileConfig
import asyncio

from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy.engine import Connection
from sqlalchemy import pool

from alembic import context

from server.app.database.base import Base
from server.app.database import model_registry
from server.app.core.config import databasesetting

# ALEMBIC CONFIG

config = context.config


# DATABASE URL

config.set_main_option(
    "sqlalchemy.url",
    databasesetting.DATABASE_URL,
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importing model_registry registers all SQLAlchemy models
# with Base.metadata.
#
# This includes:
#   - User/Auth models
#   - Waste models
#   - Future module models
#
# model_registry is intentionally imported even though it is
# not directly referenced below.

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.

    Alembic generates SQL without establishing a live
    database connection.
    """

    url = config.get_main_option(
        "sqlalchemy.url"
    )

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named"
        },
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(
    connection: Connection,
) -> None:
    """
    Run migrations using an active database connection.
    """

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Create an async SQLAlchemy engine and run Alembic
    migrations using it.
    """

    connectable = async_engine_from_config(
        config.get_section(
            config.config_ini_section,
            {},
        ),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:

        await connection.run_sync(
            do_run_migrations
        )

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Run migrations in online mode.
    """

    asyncio.run(
        run_async_migrations()
    )

if context.is_offline_mode():

    run_migrations_offline()

else:

    run_migrations_online()