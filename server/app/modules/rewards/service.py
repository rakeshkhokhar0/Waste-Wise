from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.rewards.models import (
    RewardTransaction,
    RewardTransactionType,
)
from server.app.modules.rewards.repository import RewardRepository
from server.app.modules.waste.models import (
    DisposalStep,
    WasteAnalysis,
    WasteCategoryResult,
)


# ============================================================
# EXCEPTIONS
# ============================================================


class RewardServiceError(Exception):
    """
    Base exception for reward service operations.
    """

    pass


# ============================================================
# REWARD SERVICE
# ============================================================


class RewardService:
    """
    Service layer for the Rewards module.

    Responsibilities:
        - Reward business rules
        - Award analysis rewards
        - Award step completion rewards
        - Award category completion bonuses
        - Award analysis completion bonuses
        - Reward history
        - Reward statistics
        - Leaderboard
        - User rank
        - Analysis reward information

    Transaction responsibility:
        - Repository performs database operations.
        - RewardService performs reward business logic.
        - The outer service/orchestrator controls commit/rollback
          for write operations.
    """

    # ========================================================
    # REWARD CONFIGURATION
    # ========================================================

    # Reward given after successful image analysis
    ANALYSIS_REWARD_POINTS = 20

    # Reward given for every manually completed step
    STEP_COMPLETION_POINTS = 10

    # Bonus given when all steps in one category are completed
    CATEGORY_COMPLETION_BONUS = 25

    # Bonus given when all steps in an analysis are completed
    ANALYSIS_COMPLETION_BONUS = 50

    # Pagination
    MAX_PAGE_SIZE = 100
    DEFAULT_PAGE_SIZE = 20

    # Leaderboard
    MAX_LEADERBOARD_SIZE = 100

    # ========================================================
    # INITIALIZATION
    # ========================================================

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
        """
        Get the user's reward summary.
        """

        try:
            summary = await (
                self.reward_repository.get_reward_summary(
                    user_id=user_id,
                )
            )

            return {
                "total_points": summary["total_points"],
                "total_earned": summary["total_earned"],
                "total_transactions": summary[
                    "total_transactions"
                ],
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
    ) -> tuple[list[RewardTransaction], int]:
        """
        Get paginated reward transaction history.
        """

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
            return await (
                self.reward_repository.get_reward_history(
                    user_id=user_id,
                    page=page,
                    page_size=page_size,
                )
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
    ) -> tuple[list[RewardTransaction], int]:
        """
        Get paginated reward transactions.

        This is an alias for reward history.
        """

        return await self.get_reward_history(
            user_id=user_id,
            page=page,
            page_size=page_size,
        )

    # ========================================================
    # TOTAL POINTS
    # ========================================================

    async def get_total_points(
        self,
        user_id: UUID,
    ) -> int:
        """
        Get the current available reward points.
        """

        try:
            points = await (
                self.reward_repository.get_total_points(
                    user_id=user_id,
                )
            )

            return int(points or 0)

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch total reward points."
            ) from exc

    # ========================================================
    # REWARD STATISTICS
    # ========================================================

    async def get_reward_stats(
        self,
        user_id: UUID,
    ) -> dict:
        """
        Get detailed reward statistics for a user.
        """

        try:
            return await (
                self.reward_repository.get_reward_stats(
                    user_id=user_id,
                )
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
        """
        Get users ranked by reward points.
        """

        if limit < 1 or limit > self.MAX_LEADERBOARD_SIZE:
            raise ValueError(
                f"Limit must be between 1 and "
                f"{self.MAX_LEADERBOARD_SIZE}."
            )

        try:
            return await (
                self.reward_repository.get_leaderboard(
                    limit=limit,
                )
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
        """
        Get the current leaderboard rank of a user.
        """

        try:
            return await (
                self.reward_repository.get_user_rank(
                    user_id=user_id,
                )
            )

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch user reward rank."
            ) from exc

    # ========================================================
    # ANALYSIS REWARD
    # ========================================================

    async def award_analysis_reward(
        self,
        *,
        user_id: UUID,
        analysis_id: UUID,
    ) -> RewardTransaction:
        """
        Award points after a waste image has been
        successfully analyzed.

        Reward:
            +20 points

        Rules:
            - Analysis must belong to the user.
            - Reward can only be awarded once per analysis.

        Transaction:
            - Does NOT commit.
            - Does NOT rollback.
            - Outer service controls transaction.
        """

        try:
            # ------------------------------------------------
            # Verify analysis ownership
            # ------------------------------------------------

            result = await self.session.execute(
                select(WasteAnalysis).where(
                    WasteAnalysis.id == analysis_id,
                    WasteAnalysis.user_id == user_id,
                )
            )

            analysis = result.scalar_one_or_none()

            if analysis is None:
                raise RewardServiceError(
                    "Waste analysis not found."
                )

            # ------------------------------------------------
            # Check duplicate reward
            # ------------------------------------------------

            existing_reward = (
                await self.reward_repository
                .get_analysis_reward_transaction(
                    user_id=user_id,
                    analysis_id=analysis_id,
                )
            )

            if existing_reward is not None:
                return existing_reward

            # ------------------------------------------------
            # Award analysis reward
            # ------------------------------------------------

            transaction = (
                await self.reward_repository.add_reward_points(
                    user_id=user_id,
                    points=self.ANALYSIS_REWARD_POINTS,
                    transaction_type=(
                        RewardTransactionType.ANALYSIS_REWARD
                    ),
                    description=(
                        "Reward for successfully analyzing "
                        "a waste image."
                    ),
                    waste_analysis_id=analysis_id,
                )
            )

            return transaction

        except RewardServiceError:
            raise

        except Exception as exc:
            raise RewardServiceError(
                "Failed to award analysis reward."
            ) from exc

    # ========================================================
    # STEP COMPLETION REWARD
    # ========================================================

    async def award_step_reward(
        self,
        *,
        user_id: UUID,
        step_id: UUID,
    ) -> RewardTransaction:
        """
        Award points when the user completes a disposal step.

        Reward:
            +10 points

        Rules:
            - Step must belong to the authenticated user.
            - Step must already be completed.
            - Reward can only be awarded once per step.

        Transaction:
            - Does NOT commit.
            - Does NOT rollback.
            - Outer service controls transaction.
        """

        try:
            # ------------------------------------------------
            # Get step and verify ownership
            # ------------------------------------------------

            result = await self.session.execute(
                select(
                    DisposalStep,
                    WasteCategoryResult,
                    WasteAnalysis,
                )
                .join(
                    WasteCategoryResult,
                    DisposalStep.waste_category_result_id
                    == WasteCategoryResult.id,
                )
                .join(
                    WasteAnalysis,
                    WasteCategoryResult.waste_analysis_id
                    == WasteAnalysis.id,
                )
                .where(
                    DisposalStep.id == step_id,
                    WasteAnalysis.user_id == user_id,
                )
            )

            row = result.one_or_none()

            if row is None:
                raise RewardServiceError(
                    "Disposal step not found."
                )

            step, category, analysis = row

            # ------------------------------------------------
            # Step must be completed
            # ------------------------------------------------

            if not step.is_completed:
                raise RewardServiceError(
                    "Disposal step has not been completed."
                )

            # ------------------------------------------------
            # Check duplicate reward
            # ------------------------------------------------

            existing_reward = (
                await self.reward_repository
                .get_step_reward_transaction(
                    user_id=user_id,
                    step_id=step_id,
                )
            )

            if existing_reward is not None:
                return existing_reward

            # ------------------------------------------------
            # Award step reward
            # ------------------------------------------------

            transaction = (
                await self.reward_repository.add_reward_points(
                    user_id=user_id,
                    points=self.STEP_COMPLETION_POINTS,
                    transaction_type=(
                        RewardTransactionType.STEP_COMPLETION
                    ),
                    description=(
                        f"Completed disposal step "
                        f"{step.step_number}: "
                        f"{step.instruction}"
                    ),
                    disposal_step_id=step.id,
                    waste_category_result_id=category.id,
                    waste_analysis_id=analysis.id,
                )
            )

            return transaction

        except RewardServiceError:
            raise

        except Exception as exc:
            raise RewardServiceError(
                "Failed to award disposal step reward."
            ) from exc

    # ========================================================
    # CATEGORY COMPLETION BONUS
    # ========================================================

    async def award_category_completion_bonus(
        self,
        *,
        user_id: UUID,
        category_id: UUID,
    ) -> RewardTransaction | None:
        """
        Award a bonus when all disposal steps belonging
        to a category have been completed.

        Reward:
            +25 points

        Rules:
            - Category must belong to the authenticated user.
            - Category must contain at least one step.
            - Every step must be completed.
            - Bonus can only be awarded once per category.

        Transaction:
            - Does NOT commit.
            - Does NOT rollback.
            - Outer service controls transaction.
        """

        try:
            # ------------------------------------------------
            # Get category and verify ownership
            # ------------------------------------------------

            result = await self.session.execute(
                select(
                    WasteCategoryResult,
                    WasteAnalysis,
                )
                .join(
                    WasteAnalysis,
                    WasteCategoryResult.waste_analysis_id
                    == WasteAnalysis.id,
                )
                .where(
                    WasteCategoryResult.id == category_id,
                    WasteAnalysis.user_id == user_id,
                )
            )

            row = result.one_or_none()

            if row is None:
                raise RewardServiceError(
                    "Waste category not found."
                )

            category, analysis = row

            # ------------------------------------------------
            # Check duplicate bonus
            # ------------------------------------------------

            existing_reward = (
                await self.reward_repository
                .get_category_completion_reward(
                    user_id=user_id,
                    category_id=category_id,
                )
            )

            if existing_reward is not None:
                return existing_reward

            # ------------------------------------------------
            # Get category steps
            # ------------------------------------------------

            steps_result = await self.session.execute(
                select(DisposalStep).where(
                    DisposalStep.waste_category_result_id
                    == category_id,
                )
            )

            steps = list(
                steps_result.scalars().all()
            )

            # ------------------------------------------------
            # Category must contain steps
            # ------------------------------------------------

            if not steps:
                return None

            # ------------------------------------------------
            # Check whether every step is completed
            # ------------------------------------------------

            all_steps_completed = all(
                step.is_completed
                for step in steps
            )

            if not all_steps_completed:
                return None

            # ------------------------------------------------
            # Award category completion bonus
            # ------------------------------------------------

            transaction = (
                await self.reward_repository.add_reward_points(
                    user_id=user_id,
                    points=self.CATEGORY_COMPLETION_BONUS,
                    transaction_type=(
                        RewardTransactionType
                        .CATEGORY_COMPLETION
                    ),
                    description=(
                        "Completed all disposal steps "
                        "for a waste category."
                    ),
                    waste_category_result_id=category.id,
                    waste_analysis_id=analysis.id,
                )
            )

            return transaction

        except RewardServiceError:
            raise

        except Exception as exc:
            raise RewardServiceError(
                "Failed to award category completion bonus."
            ) from exc

    # ========================================================
    # ANALYSIS COMPLETION BONUS
    # ========================================================

    async def award_analysis_completion_bonus(
        self,
        *,
        user_id: UUID,
        analysis_id: UUID,
    ) -> RewardTransaction | None:
        """
        Award a bonus when all disposal steps belonging
        to an entire waste analysis have been completed.

        Reward:
            +50 points

        Rules:
            - Analysis must belong to the authenticated user.
            - Analysis must contain at least one step.
            - Every disposal step must be completed.
            - Bonus can only be awarded once per analysis.

        Transaction:
            - Does NOT commit.
            - Does NOT rollback.
            - Outer service controls transaction.
        """

        try:
            # ------------------------------------------------
            # Verify analysis ownership
            # ------------------------------------------------

            result = await self.session.execute(
                select(WasteAnalysis).where(
                    WasteAnalysis.id == analysis_id,
                    WasteAnalysis.user_id == user_id,
                )
            )

            analysis = result.scalar_one_or_none()

            if analysis is None:
                raise RewardServiceError(
                    "Waste analysis not found."
                )

            # ------------------------------------------------
            # Check duplicate bonus
            # ------------------------------------------------

            existing_reward = (
                await self.reward_repository
                .get_analysis_completion_reward(
                    user_id=user_id,
                    analysis_id=analysis_id,
                )
            )

            if existing_reward is not None:
                return existing_reward

            # ------------------------------------------------
            # Count total disposal steps
            # ------------------------------------------------

            total_steps_result = await self.session.execute(
                select(
                    func.count(DisposalStep.id)
                )
                .join(
                    WasteCategoryResult,
                    DisposalStep.waste_category_result_id
                    == WasteCategoryResult.id,
                )
                .where(
                    WasteCategoryResult.waste_analysis_id
                    == analysis_id,
                )
            )

            total_steps = int(
                total_steps_result.scalar_one() or 0
            )

            # ------------------------------------------------
            # Analysis must contain steps
            # ------------------------------------------------

            if total_steps == 0:
                return None

            # ------------------------------------------------
            # Count incomplete steps
            # ------------------------------------------------

            incomplete_steps_result = (
                await self.session.execute(
                    select(
                        func.count(DisposalStep.id)
                    )
                    .join(
                        WasteCategoryResult,
                        DisposalStep.waste_category_result_id
                        == WasteCategoryResult.id,
                    )
                    .where(
                        WasteCategoryResult.waste_analysis_id
                        == analysis_id,
                        DisposalStep.is_completed.is_(False),
                    )
                )
            )

            incomplete_steps = int(
                incomplete_steps_result.scalar_one() or 0
            )

            # ------------------------------------------------
            # Not all steps completed
            # ------------------------------------------------

            if incomplete_steps > 0:
                return None

            # ------------------------------------------------
            # Award final analysis completion bonus
            # ------------------------------------------------

            transaction = (
                await self.reward_repository.add_reward_points(
                    user_id=user_id,
                    points=self.ANALYSIS_COMPLETION_BONUS,
                    transaction_type=(
                        RewardTransactionType.ANALYSIS_COMPLETION
                    ),
                    description=(
                        "Completed all disposal steps "
                        "for a waste analysis."
                    ),
                    waste_analysis_id=analysis.id,
                )
            )

            return transaction

        except RewardServiceError:
            raise

        except Exception as exc:
            raise RewardServiceError(
                "Failed to award analysis completion bonus."
            ) from exc

    # ========================================================
    # GET REWARDS FOR ONE ANALYSIS
    # ========================================================

    async def get_analysis_rewards(
        self,
        user_id: UUID,
        analysis_id: UUID,
    ) -> dict:
        """
        Get all reward information associated with
        one waste analysis.

        Returns:
            - analysis reward
            - step points
            - category bonuses
            - analysis completion bonus
            - total points
            - reward transactions
        """

        try:
            return await (
                self.reward_repository.get_analysis_rewards(
                    user_id=user_id,
                    analysis_id=analysis_id,
                )
            )

        except ValueError:
            raise

        except Exception as exc:
            raise RewardServiceError(
                "Failed to fetch analysis rewards."
            ) from exc