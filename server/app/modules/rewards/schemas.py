# server/app/modules/rewards/schemas.py

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RewardTransactionResponse(BaseModel):
    """Single reward transaction response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    points: int
    transaction_type: str
    description: str | None = None
    disposal_step_id: UUID | None = None
    waste_analysis_id: UUID | None = None
    created_at: datetime


class RewardSummaryResponse(BaseModel):
    """Current reward summary for a user."""

    total_points: int = Field(ge=0)
    total_earned: int = Field(ge=0)
    total_transactions: int = Field(ge=0)


class RewardHistoryResponse(BaseModel):
    """Paginated reward transaction history."""

    items: list[RewardTransactionResponse]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    has_next: bool


class RewardLeaderboardItem(BaseModel):
    """Single leaderboard entry."""

    rank: int = Field(ge=1)
    user_id: UUID
    user_name: str
    total_points: int = Field(ge=0)


class RewardLeaderboardResponse(BaseModel):
    """Leaderboard response."""

    items: list[RewardLeaderboardItem]
    total: int = Field(ge=0)


class RewardStatsResponse(BaseModel):
    """Detailed reward statistics."""

    total_points: int = Field(ge=0)
    total_earned: int = Field(ge=0)
    step_completion_points: int = Field(ge=0)
    analysis_completion_points: int = Field(ge=0)
    total_completed_steps: int = Field(ge=0)
    completed_analyses: int = Field(ge=0)
    total_spent_points: int = Field(ge=0)