# server/app/modules/waste/models.py

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.app.database.base import Base
from server.app.modules.user.models.user_model import User


if TYPE_CHECKING:
    from server.app.modules.rewards.models import RewardTransaction


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

    # Rewards module relationship.
    # Rewards owns the reward data; Waste only exposes the relationship.
    reward_transactions: Mapped[list["RewardTransaction"]] = relationship(
        "RewardTransaction",
        back_populates="waste_analysis",
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

    reward_transactions: Mapped[
        list["RewardTransaction"]
    ] = relationship(
        "RewardTransaction",
        back_populates="waste_category_result",
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

    # Rewards module relationship.
    # Reward information remains inside the Rewards module.
    reward_transactions: Mapped[list["RewardTransaction"]] = relationship(
        "RewardTransaction",
        back_populates="disposal_step",
    )

    __table_args__ = (
        Index(
            "ix_disposal_steps_category_step",
            "waste_category_result_id",
            "step_number",
        ),
    )