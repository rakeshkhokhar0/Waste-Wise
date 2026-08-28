# server/app/modules/rewards/service.py

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from server.app.modules.waste.repository import WasteRepository


class RewardServiceError(Exception):
    """Base exception for reward service operations."""

    pass


class RewardService:
    """
    Service layer for reward operations.

    Responsibilities:
        - Get user's reward summary
        - Get reward transaction history
        - Get reward statistics
        - Get leaderboard
    """

    MAX_PAGE_SIZE = 100
    DEFAULT_PAGE_SIZE = 20
    MAX_LEADERBOARD_SIZE = 100

    def __init__(
        self,
        session: AsyncSession,
        reward_repository: WasteRepository,
    ):
        self.session = session
        self.reward_repository = reward_repository

    # ========================================================
    # REWARD SUMMARY
    # ========================================================

    async def get_reward_summary(
        self,
        user_id: UUID,
    ):
        """Get the current reward summary for a user."""

        try:
            return await self.reward_repository.get_reward_summary(
                user_id=user_id,
            )

        except Exception as exc:
            await self.session.rollback()

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
        """Get paginated reward transaction history."""

        if page < 1:
            raise ValueError(
                "Page must be greater than or equal to 1."
            )

        if page_size < 1 or page_size > self.MAX_PAGE_SIZE:
            raise ValueError(
                f"Page size must be between 1 and "
                f"{self.MAX_PAGE_SIZE}."
            )

        try:
            return await self.reward_repository.get_reward_history(
                user_id=user_id,
                page=page,
                page_size=page_size,
            )

        except Exception as exc:
            await self.session.rollback()

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
        """
        Get reward transactions belonging to a user.

        This is an alias-style service method useful for
        reward history endpoints.
        """

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
    ):
        """Get detailed reward statistics for a user."""

        try:
            return await self.reward_repository.get_reward_stats(
                user_id=user_id,
            )

        except Exception as exc:
            await self.session.rollback()

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
    ):
        """Get the global reward leaderboard."""

        if limit < 1 or limit > self.MAX_LEADERBOARD_SIZE:
            raise ValueError(
                f"Limit must be between 1 and "
                f"{self.MAX_LEADERBOARD_SIZE}."
            )

        try:
            return await self.reward_repository.get_leaderboard(
                limit=limit,
            )

        except Exception as exc:
            await self.session.rollback()

            raise RewardServiceError(
                "Failed to fetch reward leaderboard."
            ) from exc

    # ========================================================
    # USER RANK
    # ========================================================

    async def get_user_rank(
        self,
        user_id: UUID,
    ):
        """Get the user's current leaderboard rank."""

        try:
            return await self.reward_repository.get_user_rank(
                user_id=user_id,
            )

        except Exception as exc:
            await self.session.rollback()

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
        """Get the user's current total reward points."""

        try:
            points = await self.reward_repository.get_total_points(
                user_id=user_id,
            )

            return int(points or 0)

        except Exception as exc:
            await self.session.rollback()

            raise RewardServiceError(
                "Failed to fetch total reward points."
            ) from exc