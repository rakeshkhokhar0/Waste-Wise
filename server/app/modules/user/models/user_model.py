import uuid
from datetime import datetime

from sqlalchemy import String,DateTime,Boolean,func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped,mapped_column,relationship

from server.app.database.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from server.app.modules.authencation.models.email_verification import EmailVerification
    from server.app.modules.authencation.models.refresh_token import RefreshToken
    from server.app.modules.authencation.models.reset_password import ResetPassword
    from server.app.modules.waste.models import WasteAnalysis
    from server.app.modules.rewards.models import RewardWallet

class User(Base):
    __tablename__="users"

    # primary key 
    id : Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    #user name 
    user_name : Mapped[str] = mapped_column(
        String(256),
        unique=True,
        nullable=False,
        index=True
    )

    #user email id 
    email : Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    #password hash 
    password_hash : Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    #activicity status
    is_active : Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    #verification status
    is_verified : Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    #account creation time 
    created_at : Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()   
    )

    # last login time
    last_login_at : Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    #user detail update time 
    updated_at : Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    #relationship 
    email_verification : Mapped[list["EmailVerification"]] = relationship(
        back_populates="user",
        cascade= "all,delete-orphan",
        lazy="selectin"
    )

    refresh_token : Mapped[list["RefreshToken"]] = relationship(
        back_populates="user",
        cascade= "all,delete-orphan",
        lazy="selectin"
    )

    reset_password : Mapped[list["ResetPassword"]] = relationship(
        back_populates="user",
        cascade= "all,delete-orphan",
        lazy="selectin"
    )

    waste_analyses: Mapped[list["WasteAnalysis"]] = relationship(
        "WasteAnalysis",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # NEW: reciprocal side of RewardWallet.user (back_populates=
    # "reward_wallet"). One user has at most one wallet.
    reward_wallet: Mapped["RewardWallet | None"] = relationship(
        "RewardWallet",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )