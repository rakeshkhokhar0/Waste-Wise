# Waste request and response schemas.
# app/modules/waste/schemas.py

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.waste.models import (
    WasteAnalysisStatus,
    WasteCategory,
)


# ============================================================
# AI ANALYSIS SCHEMAS
# ============================================================


class AIWasteCategory(BaseModel):
    """
    Structured result for one waste category returned by the
    AI vision model.

    Example:
        {
            "category": "recyclable",
            "items": [
                "plastic bottle",
                "newspaper"
            ],
            "confidence": 0.96,
            "disposal_steps": [
            "Empty and rinse the plastic bottle.",
            "Remove the bottle cap and separate it appropriately.",
            "Empty the aluminium can and keep it with the recyclable materials.",
            "Flatten the cardboard box before placing it with recyclable paper and cardboard."
        ]
        }
    """

    category: WasteCategory

    items: list[str] = Field(
        ...,
        min_length=1,
    )

    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
    )

    disposal_steps: list[str] = Field(
        ...,
        min_length=1,
    )


class AIWasteAnalysis(BaseModel):
    """
    Complete structured response expected from the AI service.
    This is an internal schema and is not necessarily returned
    directly to the frontend.
    """

    summary: str = Field(
        ...,
        min_length=1,
        description="Short summary of the waste detected in the image.",
    )

    categories: list[AIWasteCategory] = Field(
        ...,
        min_length=1,
        description="Waste categories detected in the image.",
    )


# ============================================================
# DISPOSAL STEP SCHEMAS
# ============================================================


class DisposalStepUpdate(BaseModel):
    """
    Request schema for marking a disposal step as completed
    or incomplete.
    """

    is_completed: bool


class DisposalStepResponse(BaseModel):
    """
    Response schema for displaying one disposal step.
    """

    id: UUID

    step_number: int = Field(
        ...,
        ge=1,
    )

    instruction: str

    is_completed: bool

    completed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# WEIGHT SCHEMAS
# ============================================================


class WasteWeightUpdate(BaseModel):
    """
    Request schema for submitting the weight of one waste
    category.

    Weight is always stored in kilograms.
    """

    weight_kg: float = Field(
        ...,
        gt=0,
        le=100000,
        description="Weight of the waste category in kilograms.",
    )


# ============================================================
# CATEGORY RESULT SCHEMAS
# ============================================================


class WasteCategoryResultResponse(BaseModel):
    """
    Complete response for one waste category.

    Contains:
        - detected items
        - AI confidence
        - user-entered weight
        - disposal steps
        - calculated disposal progress
    """

    id: UUID

    category: WasteCategory

    items: list[str]

    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    weight_kg: float | None = Field(
        default=None,
        ge=0,
    )

    weight_entered_at: datetime | None = None

    disposal_steps: list[DisposalStepResponse] = Field(
        default_factory=list,
    )

    # --------------------------------------------------------
    # Calculated fields
    # --------------------------------------------------------

    total_steps: int = Field(
        default=0,
        ge=0,
    )

    completed_steps: int = Field(
        default=0,
        ge=0,
    )

    progress_percentage: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# WASTE ANALYSIS RESPONSE
# ============================================================


class WasteAnalysisResponse(BaseModel):
    """
    Complete response for one waste analysis.

    This is the main response used by the frontend after
    analyzing an image or fetching a specific analysis.
    """

    id: UUID

    image_url: str

    status: WasteAnalysisStatus

    ai_summary: str | None = None

    categories: list[WasteCategoryResultResponse] = Field(
        default_factory=list,
    )

    # --------------------------------------------------------
    # Overall calculated disposal progress
    # --------------------------------------------------------

    total_steps: int = Field(
        default=0,
        ge=0,
    )

    completed_steps: int = Field(
        default=0,
        ge=0,
    )

    progress_percentage: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
    )

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# HISTORY SCHEMAS
# ============================================================


class WasteCategoryHistoryResponse(BaseModel):
    """
    Lightweight category information used in waste history.

    Disposal steps are intentionally excluded so that the
    history endpoint does not return unnecessary data.
    """

    category: WasteCategory

    weight_kg: float | None = Field(
        default=None,
        ge=0,
    )


class WasteAnalysisListResponse(BaseModel):
    """
    Lightweight response for one item in the user's waste
    analysis history.

    Full disposal steps are not included here.
    The frontend can fetch the complete analysis separately
    using the analysis ID.
    """

    id: UUID

    image_url: str

    status: WasteAnalysisStatus

    categories: list[WasteCategoryHistoryResponse] = Field(
        default_factory=list,
    )

    total_steps: int = Field(
        default=0,
        ge=0,
    )

    completed_steps: int = Field(
        default=0,
        ge=0,
    )

    progress_percentage: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
    )

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# OPTIONAL PAGINATED HISTORY RESPONSE
# ============================================================


class WasteAnalysisHistoryResponse(BaseModel):
    """
    Wrapper for paginated waste history.

    This will be useful when the user has many analyses.
    """

    items: list[WasteAnalysisListResponse]

    total: int = Field(
        ...,
        ge=0,
    )

    page: int = Field(
        ...,
        ge=1,
    )

    page_size: int = Field(
        ...,
        ge=1,
    )

    has_next: bool
