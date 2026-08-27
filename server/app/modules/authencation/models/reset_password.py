import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.modules.user.models.user_model import User

class ResetPassword(Base):
    __tablename__ = "reset_password"

    # primary key 
    id : Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        # CHANGE: UUID callable gives every password-reset row a distinct id.
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
        nullable=False,
        unique=True,
        index=True,
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

    used_at : Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True, 
    )

    #relationship
    user : Mapped["User"] = relationship(
        back_populates="reset_password",
        lazy="selectin"
    )
