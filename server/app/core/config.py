# WasteWise backend configuration settings live in this module.
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings,SettingsConfigDict

# CHANGE: resolve the environment file from this source file so launching from
# either the repository root or the server directory loads the same settings.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class AppSetting(BaseSettings):
    APP_NAME : str
    APP_VERSION : str
    APP_ENV : str
    DEBUG : bool
    HOST : str
    PORT : int
    # CHANGE: production CORS origins are explicit instead of a wildcard.
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        extra="ignore",
    )

appsetting = AppSetting()


class DatabaseSetting(BaseSettings):
    DATABASE_URL : str
    DB_POOL_SIZE : int
    DB_MAX_OVERFLOW : int
    DB_POOL_TIMEOUT : int
    DB_POOL_RECYCLE : int
    DB_POOL_PRE_PING :  bool
    DB_ECHO : bool

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        extra="ignore",
    )

databasesetting = DatabaseSetting()

class JWTSetting(BaseSettings):
    JWT_SECRET_KEY : str
    JWT_ALGORITHM : str
    ACCESS_TOKEN_EXPIRE_MINUTES : int
    # CHANGE: accept the old misspelled environment key temporarily so current
    # deployments keep working while the documented name is corrected.
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        validation_alias=AliasChoices(
            "REFRESH_TOKEN_EXPIRE_DAYS", "REFRESH_TOKNE_EXPIRE_DAYS", "REFRESH_TOKNEN_EXPIRE_DAYS"
        )
    )
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        extra="ignore",
    )

jwtsetting = JWTSetting()

class EmailSetting(BaseSettings):
    #Email service
    SMTP_HOST:str
    SMTP_PORT:int
    SMTP_EMAIL:str
    SMTP_PASSWORD:str
    FRONTEND_URL:str
    EMAIL_VERIFICATION_EXPIRE_MINUTES:int
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        extra="ignore",
    )

emailsetting = EmailSetting()



class ResetPasswordSetting(BaseSettings):
    #password reset
    PASSWORD_RESET_EXPIRE_MINUTE : int
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        extra="ignore",
    )

resetpassword = ResetPasswordSetting()
