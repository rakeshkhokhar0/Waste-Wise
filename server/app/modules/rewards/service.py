# server/app/modules/rewards/service.py

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.rewards.models import RewardTransactionType
from server.app.modules.rewards.repository import RewardRepository


class RewardServiceError(Exception):
    """Base exception for reward service operations."""


class RewardService:
    """
    Service layer for the Rewards module.

    Contains only reward-related business logic.
    """

    MAX_PAGE_SIZE = 100
    DEFAULT_PAGE_SIZE = 20
    MAX_LEADERBOARD_SIZE = 100

    FINAL_COMPLETION_BONUS = 50

    def __init__(
        self,
        session: AsyncSession,
        reward_repository: RewardRepository,
    ):
        self.session = session
        self.reward_repository = reward_repository

    # ========================================================
    # REWARD SUMMARY
    # ========================================================

    async def get_reward_summary(
        self,
        user_id: UUID,
    ) -> dict:

        try:
            summary = await self.reward_repository.get_reward_summary(
                user_id=user_id,
            )

            return {
                "total_points": summary["total_points"],
                "total_earned": summary["total_earned_points"],
                "total_transactions": summary["transaction_count"],
            }

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch reward summary."
            ) from exc

    # ========================================================
    # REWARD HISTORY
    # ========================================================

    async def get_reward_history(
        self,
        user_id: UUID,
        *,
        page: int = 1,
        page_size: int = DEFAULT_PAGE_SIZE,
    ):
        if page < 1:
            raise ValueError(
                "Page must be greater than or equal to 1."
            )

        if page_size < 1 or page_size > self.MAX_PAGE_SIZE:
            raise ValueError(
                f"Page size must be between 1 and {self.MAX_PAGE_SIZE}."
            )

        try:
            return await self.reward_repository.get_reward_history(
                user_id=user_id,
                page=page,
                page_size=page_size,
            )

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch reward history."
            ) from exc

    # ========================================================
    # REWARD TRANSACTIONS
    # ========================================================

    async def get_transactions(
        self,
        user_id: UUID,
        *,
        page: int = 1,
        page_size: int = DEFAULT_PAGE_SIZE,
    ):
        return await self.get_reward_history(
            user_id=user_id,
            page=page,
            page_size=page_size,
        )

    # ========================================================
    # REWARD STATISTICS
    # ========================================================

    async def get_reward_stats(
        self,
        user_id: UUID,
    ) -> dict:

        try:
            return await self.reward_repository.get_reward_stats(
                user_id=user_id,
            )

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch reward statistics."
            ) from exc

    # ========================================================
    # LEADERBOARD
    # ========================================================

    async def get_leaderboard(
        self,
        *,
        limit: int = 10,
    ) -> list[dict]:

        if limit < 1 or limit > self.MAX_LEADERBOARD_SIZE:
            raise ValueError(
                f"Limit must be between 1 and {self.MAX_LEADERBOARD_SIZE}."
            )

        try:
            return await self.reward_repository.get_leaderboard(
                limit=limit,
            )

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch reward leaderboard."
            ) from exc

    # ========================================================
    # USER RANK
    # ========================================================

    async def get_user_rank(
        self,
        user_id: UUID,
    ) -> dict | None:

        try:
            return await self.reward_repository.get_user_rank(
                user_id=user_id,
            )

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch user reward rank."
            ) from exc

    # ========================================================
    # TOTAL POINTS
    # ========================================================

    async def get_total_points(
        self,
        user_id: UUID,
    ) -> int:

        try:
            points = await self.reward_repository.get_total_points(
                user_id=user_id,
            )

            return int(points or 0)

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch total reward points."
            ) from exc

    # ========================================================
    # AWARD STEP REWARD
    # ========================================================

    async def award_step_reward(
        self,
        *,
        user_id: UUID,
        step_id: UUID,
        analysis_id: UUID,
        step_number: int,
        instruction: str,
        points: int,
    ):

        if points <= 0:
            raise RewardServiceError(
                "Invalid reward points for disposal step."
            )

        try:
            existing_reward = (
                await self.reward_repository.get_step_reward_transaction(
                    step_id=step_id,
                )
            )

            if existing_reward is not None:
                return existing_reward

            return await self.reward_repository.add_reward_points(
                user_id=user_id,
                points=points,
                transaction_type=RewardTransactionType.STEP_COMPLETION,
                description=(
                    f"Completed disposal step "
                    f"{step_number}: {instruction}"
                ),
                disposal_step_id=step_id,
                waste_analysis_id=analysis_id,
            )

        except RewardServiceError:
            raise

        except Exception as exc:
            raise RewardServiceError(
                "Failed to award disposal step reward."
            ) from exc

    # ========================================================
    # AWARD FINAL COMPLETION BONUS
    # ========================================================

    async def award_completion_bonus(
        self,
        *,
        user_id: UUID,
        analysis_id: UUID,
    ):

        try:
            existing_reward = (
                await self.reward_repository.get_analysis_completion_reward(
                    analysis_id=analysis_id,
                )
            )

            if existing_reward is not None:
                return existing_reward

            return await self.reward_repository.add_reward_points(
                user_id=user_id,
                points=self.FINAL_COMPLETION_BONUS,
                transaction_type=(
                    RewardTransactionType.ANALYSIS_COMPLETION
                ),
                description=(
                    "Completed all disposal steps "
                    "for a waste analysis."
                ),
                waste_analysis_id=analysis_id,
            )

        except RewardServiceError:
            raise

        except Exception as exc:
            raise RewardServiceError(
                "Failed to award final completion bonus."
            ) from exc