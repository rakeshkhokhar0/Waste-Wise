from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ============================================================
# REWARD TRANSACTION
# ============================================================

class RewardTransactionResponse(BaseModel):
    """
    Represents a single reward transaction.

    Positive points:
        Points earned.

    Negative points:
        Points spent.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID

    user_id: UUID

    points: int

    transaction_type: str

    description: str

    disposal_step_id: UUID | None = None

    waste_category_result_id: UUID | None = None

    waste_analysis_id: UUID | None = None

    created_at: datetime

# ============================================================
# REWARD SUMMARY
# ============================================================

class RewardSummaryResponse(BaseModel):
    """
    Current reward summary of the authenticated user.
    """

    total_points: int = Field(
        ge=0,
        description="Current available reward points.",
    )

    total_earned: int = Field(
        ge=0,
        description="Total reward points earned.",
    )

    total_transactions: int = Field(
        ge=0,
        description="Total number of reward transactions.",
    )

# ============================================================
# REWARD HISTORY
# ============================================================

class RewardHistoryResponse(BaseModel):
    """
    Paginated reward transaction history.
    """

    items: list[RewardTransactionResponse]

    total: int = Field(
        ge=0,
        description="Total number of transactions.",
    )

    page: int = Field(
        ge=1,
        description="Current page number.",
    )

    page_size: int = Field(
        ge=1,
        le=100,
        description="Number of transactions per page.",
    )

    has_next: bool

# ============================================================
# LEADERBOARD
# ============================================================

class RewardLeaderboardItem(BaseModel):
    """
    Single leaderboard entry.
    """

    rank: int = Field(
        ge=1,
    )

    user_id: UUID

    user_name: str

    total_points: int = Field(
        ge=0,
    )

class RewardLeaderboardResponse(BaseModel):
    """
    Reward leaderboard response.
    """

    items: list[RewardLeaderboardItem]

    total: int = Field(
        ge=0,
    )

# ============================================================
# REWARD STATISTICS
# ============================================================

class RewardStatsResponse(BaseModel):
    """
    Detailed reward statistics for the authenticated user.
    """

    total_points: int = Field(
        ge=0,
    )

    total_earned: int = Field(
        ge=0,
    )

    analysis_reward_points: int = Field(
        ge=0,
    )

    step_completion_points: int = Field(
        ge=0,
    )

    category_completion_points: int = Field(
        ge=0,
    )

    analysis_completion_points: int = Field(
        ge=0,
    )

    total_completed_steps: int = Field(
        ge=0,
    )

    completed_categories: int = Field(
        ge=0,
    )

    completed_analyses: int = Field(
        ge=0,
    )

    total_spent_points: int = Field(
        ge=0,
    )

# ============================================================
# ANALYSIS REWARD SUMMARY
# ============================================================

class AnalysisRewardResponse(BaseModel):
    """
    Rewards earned from a single waste analysis.
    """

    analysis_id: UUID

    user_id: UUID

    analysis_reward: int = Field(
        ge=0,
        description="Points awarded after successful analysis.",
    )

    step_points: int = Field(
        ge=0,
        description="Total points earned from completed steps.",
    )

    category_bonus: int = Field(
        ge=0,
        description="Total category completion bonuses.",
    )

    completion_bonus: int = Field(
        ge=0,
        description="Final analysis completion bonus.",
    )

    total_points: int = Field(
        ge=0,
        description="Total reward points earned from this analysis.",
    )
    transactions: list[RewardTransactionResponse]