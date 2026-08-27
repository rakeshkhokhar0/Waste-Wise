import uuid  # noqa: I001
from datetime import datetime

from sqlalchemy import String,DateTime,ForeignKey,func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped,mapped_column,relationship
from typing import TYPE_CHECKING

from app.database.base import Base

if TYPE_CHECKING:
    from app.modules.user.models.user_model import User



class RefreshToken(Base):
    __tablename__ = "refresh_token"

    # primary key 
    id : Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    #user id 
    user_id : Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id",ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    #token 
    token_hash : Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    #token creation time 
    created_at : Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    #token expire time 
    expires_at : Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    revoked_at : Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True, 
    )

    #relationship
    user : Mapped["User"]=relationship(
        back_populates="refresh_token",
        lazy="selectin"
    )
