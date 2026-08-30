# app/modules/waste/models.py

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
    Numeric,
    String,
    Text,
    JSON,
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
    Categories used for disposal and reward calculation.
    """

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
    """
    Stores one complete waste-image analysis.

    One user can have many analyses.
    One analysis can contain multiple waste categories.
    """

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

    # NEW: reciprocal side of RewardTransaction.waste_analysis
    # (back_populates="waste_analysis"). Analysis-level and
    # analysis-completion-bonus transactions reference this.
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
    """
    Represents one waste category detected inside an analysis.

    Example:

        Analysis #1
            ├── RECYCLABLE
            ├── ORGANIC
            └── E_WASTE

    The `items` field stores the individual objects detected
    within that category.
    """

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

    # AI confidence for this category result.
    #
    # Example:
    # 0.96
    #
    # Stored as DECIMAL to avoid floating-point precision issues.
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

    # NEW: reciprocal side of RewardTransaction
    # .waste_category_result (back_populates=
    # "waste_category_result"). Category-completion bonuses
    # reference this.
    reward_transactions: Mapped[list["RewardTransaction"]] = relationship(
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
    """
    Stores individual disposal instructions for a waste category.

    Example:

        RECYCLABLE
            Step 1 -> Separate recyclable materials
            Step 2 -> Clean recyclable containers
            Step 3 -> Put them in recycling collection
    """

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

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    waste_category_result: Mapped["WasteCategoryResult"] = relationship(
        "WasteCategoryResult",
        back_populates="disposal_steps",
    )

    # NEW: reciprocal side of RewardTransaction.disposal_step
    # (back_populates="disposal_step"). Per-step reward
    # transactions reference this.
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