import secrets
import hashlib

from datetime import datetime,timedelta,timezone

class TokenService:
    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token:str):
        return hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()
    
    @staticmethod
    def create_expire(expire_minute:int)->datetime:
        return datetime.now(timezone.utc)+timedelta(minutes=expire_minute)
