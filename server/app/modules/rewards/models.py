import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

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


if TYPE_CHECKING:
    from server.app.modules.user.models.user_model import User
    from server.app.modules.waste.models import (
        DisposalStep,
        WasteAnalysis,
        WasteCategoryResult,
    )


# ============================================================
# ENUMS
# ============================================================


class RewardTransactionType(str, enum.Enum):
    """
    Type of reward transaction.
    """

    # Reward given after successful image analysis
    ANALYSIS_REWARD = "analysis_reward"

    # Reward given when user completes an individual step
    STEP_COMPLETION = "step_completion"

    # Bonus given when all steps of a category are completed
    CATEGORY_COMPLETION = "category_completion"

    # Bonus given when all steps/categories of an analysis
    # are completed
    ANALYSIS_COMPLETION = "analysis_completion"

    # Points spent by the user
    MARKETPLACE_REDEMPTION = "marketplace_redemption"

    # Manual/admin reward adjustment
    ADJUSTMENT = "adjustment"


# ============================================================
# REWARD WALLET
# ============================================================


class RewardWallet(Base):
    """
    Stores the reward balance of a user.

    One user can have only one reward wallet.
    """

    __tablename__ = "reward_wallets"

    # --------------------------------------------------------
    # Primary Key
    # --------------------------------------------------------

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # --------------------------------------------------------
    # User
    # --------------------------------------------------------

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    # --------------------------------------------------------
    # Points
    # --------------------------------------------------------

    # Total points earned by the user
    total_earned_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Total points spent by the user
    total_spent_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Current available points
    balance_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # --------------------------------------------------------
    # Timestamps
    # --------------------------------------------------------

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

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

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


# ============================================================
# REWARD TRANSACTION
# ============================================================


class RewardTransaction(Base):
    """
    Stores every movement of reward points.

    Positive points:
        Points earned.

    Negative points:
        Points spent.

    A transaction can optionally reference:
        - WasteAnalysis
        - WasteCategoryResult
        - DisposalStep
    """

    __tablename__ = "reward_transactions"

    # --------------------------------------------------------
    # Primary Key
    # --------------------------------------------------------

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # --------------------------------------------------------
    # Wallet Reference
    # --------------------------------------------------------

    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "reward_wallets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # User Reference
    # --------------------------------------------------------

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # Waste Analysis Reference
    # --------------------------------------------------------

    # Used by:
    #   ANALYSIS_REWARD
    #   ANALYSIS_COMPLETION
    #
    # Nullable because other transactions may not belong
    # to a particular analysis.
    waste_analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "waste_analyses.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------------
    # Waste Category Reference
    # --------------------------------------------------------

    # Used by:
    #   CATEGORY_COMPLETION
    #
    # Identifies the category for which all steps
    # were completed.
    waste_category_result_id: Mapped[
        uuid.UUID | None
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "waste_category_results.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------------
    # Disposal Step Reference
    # --------------------------------------------------------

    # Used by:
    #   STEP_COMPLETION
    #
    # Identifies the exact step completed by the user.
    disposal_step_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "disposal_steps.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------------
    # Transaction Type
    # --------------------------------------------------------

    transaction_type: Mapped[RewardTransactionType] = mapped_column(
        SQLEnum(
            RewardTransactionType,
            name="reward_transaction_type",
        ),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # Points
    # --------------------------------------------------------

    # Positive = points earned
    # Negative = points spent
    points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # --------------------------------------------------------
    # Description
    # --------------------------------------------------------

    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

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

    waste_category_result: Mapped[
        "WasteCategoryResult | None"
    ] = relationship(
        "WasteCategoryResult",
        back_populates="reward_transactions",
    )

    # ========================================================
    # INDEXES
    # ========================================================

    __table_args__ = (
        # User reward history
        Index(
            "ix_reward_transactions_user_created",
            "user_id",
            "created_at",
        ),

        # Wallet transaction history
        Index(
            "ix_reward_transactions_wallet_created",
            "wallet_id",
            "created_at",
        ),

        # Analysis reward lookup
        Index(
            "ix_reward_transactions_analysis_type",
            "waste_analysis_id",
            "transaction_type",
        ),

        # Category completion reward lookup
        Index(
            "ix_reward_transactions_category_type",
            "waste_category_result_id",
            "transaction_type",
        ),

        # Step completion reward lookup
        Index(
            "ix_reward_transactions_step_type",
            "disposal_step_id",
            "transaction_type",
        ),
    )