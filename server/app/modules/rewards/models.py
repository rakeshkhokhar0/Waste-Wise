# server/app/modules/waste/models.py

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.app.database.base import Base
from server.app.modules.user.models.user_model import User


# ============================================================
# ENUMS
# ============================================================


class WasteAnalysisStatus(str, enum.Enum):
    """
    Represents the lifecycle of a waste analysis.
    """

    PENDING = "pending"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class WasteCategory(str, enum.Enum):
    """
    Categories used for waste classification and disposal.
    """

    RECYCLABLE = "recyclable"
    ORGANIC = "organic"
    E_WASTE = "e_waste"
    HAZARDOUS = "hazardous"
    NON_RECYCLABLE = "non_recyclable"
    COMPOSTABLE = "compostable"


class RewardStepType(str, enum.Enum):
    """
    Difficulty/type of a disposal step.

    Points are assigned according to the type of work
    required from the user.
    """

    BASIC = "basic"
    NORMAL = "normal"
    IMPORTANT = "important"
    COMPLEX = "complex"


class RewardTransactionType(str, enum.Enum):
    """
    Represents why reward points were added or removed.
    """

    STEP_COMPLETION = "step_completion"
    ANALYSIS_COMPLETION = "analysis_completion"
    MARKETPLACE_REDEMPTION = "marketplace_redemption"
    ADJUSTMENT = "adjustment"


# ============================================================
# WASTE ANALYSIS
# ============================================================


class WasteAnalysis(Base):
    """
    Stores one complete waste-image analysis.

    One user can have many analyses.

    One analysis can contain multiple waste categories.

    Example:

        User
          |
          +-- WasteAnalysis
                  |
                  +-- WasteCategoryResult
                  |       |
                  |       +-- DisposalStep
                  |       +-- DisposalStep
                  |
                  +-- WasteCategoryResult
                          |
                          +-- DisposalStep

    Reward flow:

        DisposalStep completed
                ↓
        RewardTransaction created
                ↓
        User RewardWallet updated
    """

    __tablename__ = "waste_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    status: Mapped[WasteAnalysisStatus] = mapped_column(
        SQLEnum(
            WasteAnalysisStatus,
            name="waste_analysis_status",
        ),
        nullable=False,
        default=WasteAnalysisStatus.PENDING,
        index=True,
    )

    ai_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # --------------------------------------------------------
    # Reward tracking
    # --------------------------------------------------------

    completion_reward_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    completion_reward_awarded: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    user: Mapped["User"] = relationship(
        "User",
        back_populates="waste_analyses",
    )

    category_results: Mapped[list["WasteCategoryResult"]] = relationship(
        "WasteCategoryResult",
        back_populates="waste_analysis",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="WasteCategoryResult.created_at",
    )

    reward_transactions: Mapped[list["RewardTransaction"]] = relationship(
        "RewardTransaction",
        back_populates="waste_analysis",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index(
            "ix_waste_analyses_user_created",
            "user_id",
            "created_at",
        ),
    )


# ============================================================
# WASTE CATEGORY RESULT
# ============================================================


class WasteCategoryResult(Base):
    """
    Represents one waste category detected inside an analysis.

    Example:

        Analysis #1
            ├── RECYCLABLE
            ├── ORGANIC
            └── E_WASTE

    The `items` field stores individual objects detected
    within that category.
    """

    __tablename__ = "waste_category_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    waste_analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "waste_analyses.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    category: Mapped[WasteCategory] = mapped_column(
        SQLEnum(
            WasteCategory,
            name="waste_category",
        ),
        nullable=False,
        index=True,
    )

    # Example:
    #
    # [
    #     "plastic bottle",
    #     "newspaper",
    #     "aluminium can"
    # ]
    #
    items: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # AI confidence.
    #
    # Example:
    # 0.96
    #
    confidence: Mapped[float | None] = mapped_column(
        Numeric(5, 4),
        nullable=True,
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

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    waste_analysis: Mapped["WasteAnalysis"] = relationship(
        "WasteAnalysis",
        back_populates="category_results",
    )

    disposal_steps: Mapped[list["DisposalStep"]] = relationship(
        "DisposalStep",
        back_populates="waste_category_result",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="DisposalStep.step_number",
    )

    __table_args__ = (
        Index(
            "ix_category_results_analysis_category",
            "waste_analysis_id",
            "category",
        ),
    )


# ============================================================
# DISPOSAL STEP
# ============================================================


class DisposalStep(Base):
    """
    Stores an individual disposal instruction.

    Each step has a reward value.

    Example:

        Step 1:
            "Separate the recyclable materials."
            type = BASIC
            points = 5

        Step 2:
            "Wash and dry the containers."
            type = NORMAL
            points = 10

        Step 3:
            "Take electronic waste to an authorized
             collection center."
            type = COMPLEX
            points = 25

    Reward is awarded only when the step changes from
    incomplete -> completed.
    """

    __tablename__ = "disposal_steps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    waste_category_result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "waste_category_results.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    step_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    instruction: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # --------------------------------------------------------
    # Reward configuration
    # --------------------------------------------------------

    reward_step_type: Mapped[RewardStepType] = mapped_column(
        SQLEnum(
            RewardStepType,
            name="reward_step_type",
        ),
        nullable=False,
        default=RewardStepType.NORMAL,
    )

    reward_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
    )

    reward_awarded: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    reward_awarded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    waste_category_result: Mapped["WasteCategoryResult"] = relationship(
        "WasteCategoryResult",
        back_populates="disposal_steps",
    )

    reward_transactions: Mapped[list["RewardTransaction"]] = relationship(
        "RewardTransaction",
        back_populates="disposal_step",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index(
            "ix_disposal_steps_category_step",
            "waste_category_result_id",
            "step_number",
        ),
    )


# ============================================================
# REWARD WALLET
# ============================================================


class RewardWallet(Base):
    """
    Stores the user's current reward-point balance.

    One user has exactly one reward wallet.

    Example:

        User
          |
          +-- RewardWallet
                  total_earned_points = 150
                  total_spent_points = 50
                  balance_points = 100
    """

    __tablename__ = "reward_wallets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

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

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

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
    Immutable history of reward-point changes.

    Examples:

        +5   Step completed
        +10  Step completed
        +25  Complex step completed
        +50  Entire analysis completed
        -100 Marketplace redemption

    The transaction table prevents us from losing the user's
    reward history.
    """

    __tablename__ = "reward_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "reward_wallets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # Optional because an adjustment or marketplace transaction
    # may not belong to a specific disposal step.
    disposal_step_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "disposal_steps.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # Optional because not every reward transaction needs to
    # belong to an analysis.
    waste_analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "waste_analyses.id",
            ondelete="SET NULL",
        ),
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

    # Positive value = points earned.
    # Negative value = points spent.
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

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

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