import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.app.database.base import Base
from server.app.modules.user.models.user_model import User
from server.app.modules.waste.models import (
    DisposalStep,
    WasteAnalysis,
)


class RewardStepType(str, enum.Enum):
    BASIC = "basic"
    NORMAL = "normal"
    IMPORTANT = "important"
    COMPLEX = "complex"


class RewardTransactionType(str, enum.Enum):
    STEP_COMPLETION = "step_completion"
    ANALYSIS_COMPLETION = "analysis_completion"
    MARKETPLACE_REDEMPTION = "marketplace_redemption"
    ADJUSTMENT = "adjustment"


class RewardWallet(Base):
    __tablename__ = "reward_wallets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    total_earned_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    total_spent_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    balance_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="reward_wallet",
    )

    transactions: Mapped[list["RewardTransaction"]] = relationship(
        "RewardTransaction",
        back_populates="wallet",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="RewardTransaction.created_at",
    )


class RewardTransaction(Base):
    __tablename__ = "reward_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reward_wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    disposal_step_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("disposal_steps.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    waste_analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("waste_analyses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    transaction_type: Mapped[RewardTransactionType] = mapped_column(
        SQLEnum(
            RewardTransactionType,
            name="reward_transaction_type",
        ),
        nullable=False,
        index=True,
    )

    points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    wallet: Mapped["RewardWallet"] = relationship(
        "RewardWallet",
        back_populates="transactions",
    )

    user: Mapped["User"] = relationship(
        "User",
    )

    disposal_step: Mapped["DisposalStep | None"] = relationship(
        "DisposalStep",
        back_populates="reward_transactions",
    )

    waste_analysis: Mapped["WasteAnalysis | None"] = relationship(
        "WasteAnalysis",
        back_populates="reward_transactions",
    )

    __table_args__ = (
        Index(
            "ix_reward_transactions_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_reward_transactions_wallet_created",
            "wallet_id",
            "created_at",
        ),
    )