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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.app.database.base import Base
from server.app.modules.user.models.user_model import User


# ============================================================
# ENUMS
# ============================================================


class WasteAnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class WasteCategory(str, enum.Enum):
    RECYCLABLE = "recyclable"
    ORGANIC = "organic"
    E_WASTE = "e_waste"
    HAZARDOUS = "hazardous"
    NON_RECYCLABLE = "non_recyclable"
    COMPOSTABLE = "compostable"


class RewardStepType(str, enum.Enum):
    BASIC = "basic"
    NORMAL = "normal"
    IMPORTANT = "important"
    COMPLEX = "complex"


class RewardTransactionType(str, enum.Enum):
    STEP_COMPLETION = "step_completion"
    ANALYSIS_COMPLETION = "analysis_completion"
    MARKETPLACE_REDEMPTION = "marketplace_redemption"


# ============================================================
# WASTE ANALYSIS
# ============================================================


class WasteAnalysis(Base):
    __tablename__ = "waste_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    status: Mapped[WasteAnalysisStatus] = mapped_column(
        SQLEnum(WasteAnalysisStatus),
        nullable=False,
        default=WasteAnalysisStatus.PENDING,
        index=True,
    )

    ai_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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
        foreign_keys="RewardTransaction.waste_analysis_id",
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
    __tablename__ = "waste_category_results"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    waste_analysis_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "waste_analyses.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    category: Mapped[WasteCategory] = mapped_column(
        SQLEnum(WasteCategory),
        nullable=False,
        index=True,
    )

    items: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

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
    __tablename__ = "disposal_steps"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    waste_category_result_id: Mapped[uuid.UUID] = mapped_column(
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

    reward_step_type: Mapped[RewardStepType] = mapped_column(
        SQLEnum(RewardStepType),
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

    waste_category_result: Mapped["WasteCategoryResult"] = relationship(
        "WasteCategoryResult",
        back_populates="disposal_steps",
    )

    reward_transactions: Mapped[list["RewardTransaction"]] = relationship(
        "RewardTransaction",
        back_populates="disposal_step",
        foreign_keys="RewardTransaction.disposal_step_id",
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
    __tablename__ = "reward_wallets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
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
        foreign_keys=[user_id],
    )

    transactions: Mapped[list["RewardTransaction"]] = relationship(
        "RewardTransaction",
        back_populates="wallet",
        cascade="all, delete-orphan",
    )


# ============================================================
# REWARD TRANSACTION
# ============================================================


class RewardTransaction(Base):
    __tablename__ = "reward_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    wallet_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "reward_wallets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    disposal_step_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "disposal_steps.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    waste_analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "waste_analyses.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    transaction_type: Mapped[RewardTransactionType] = mapped_column(
        SQLEnum(RewardTransactionType),
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
        foreign_keys=[user_id],
    )

    disposal_step: Mapped["DisposalStep | None"] = relationship(
        "DisposalStep",
        back_populates="reward_transactions",
        foreign_keys=[disposal_step_id],
    )

    waste_analysis: Mapped["WasteAnalysis | None"] = relationship(
        "WasteAnalysis",
        back_populates="reward_transactions",
        foreign_keys=[waste_analysis_id],
    )

    __table_args__ = (
        Index(
            "ix_reward_transactions_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_reward_transactions_step_type",
            "disposal_step_id",
            "transaction_type",
        ),
        Index(
            "ix_reward_transactions_analysis_type",
            "waste_analysis_id",
            "transaction_type",
        ),
    )