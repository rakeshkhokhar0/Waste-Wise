from app.core.config import jwtsetting
from app.modules.authencation.schemas import TokenPayload
from datetime import datetime,timezone,timedelta

import jwt
from uuid import UUID,uuid4

class JWTService:

    @staticmethod
    def create_access_token(user_id:UUID)->str:
        return JWTService._generate_token(
            user_id=user_id,
            token_type="access",
            expire_in_minutes=jwtsetting.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    @staticmethod
    def create_refresh_token(user_id:UUID)->str:
        return JWTService._generate_token(
            user_id=user_id,
            token_type="refresh",
            expire_in_minutes=jwtsetting.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60
        )

    @staticmethod
    def decode_token(token:str)->TokenPayload:
        try:
            payload = jwt.decode(
                token,
                jwtsetting.JWT_SECRET_KEY,
                algorithms=[jwtsetting.JWT_ALGORITHM,]
            )
            return TokenPayload(**payload)
        except jwt.ExpiredSignatureError:
            raise ValueError("Token is expired")
        
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")

    @staticmethod
    def verify_token_type(payload:TokenPayload, expected_type:str)->None:
        if payload.type != expected_type:
            # CHANGE: returning an exception silently allowed invalid token types.
            raise ValueError(
                f"Expected '{expected_type}' token but received '{payload.type}' token."
            )

    @staticmethod
    def _generate_token(user_id:UUID | str, token_type:str, expire_in_minutes:int) -> str:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=expire_in_minutes)
        payload = {
            # CHANGE: JWT payloads must contain JSON-serializable primitives.
            "sub" : str(user_id),
            "type": token_type,
            "iat" : int(now.timestamp()),
            "exp" : int(expires_at.timestamp()),
            "jti" : str(uuid4())
        }

        return jwt.encode(payload=payload,key=jwtsetting.JWT_SECRET_KEY,algorithm=jwtsetting.JWT_ALGORITHM)
