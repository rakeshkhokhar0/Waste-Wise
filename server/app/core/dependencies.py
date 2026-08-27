from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import jwtsetting
from app.database.database import get_db
from app.modules.user.models.user_model import User
from app.modules.user.repository.user_repo import UserRepository

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
    )

    try:
        payload = jwt.decode(
            token,
            jwtsetting.JWT_SECRET_KEY,
            algorithms=[jwtsetting.JWT_ALGORITHM],
        )

        user_id = payload.get("sub")

        # Only access tokens may authorize protected APIs.
        if user_id is None or payload.get("type") != "access":
            raise credentials_exception

    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    repository = UserRepository(db)

    user = await repository.get_user_by_id(UUID(user_id))

    if user is None or not user.is_active:
        raise credentials_exception

    return user
