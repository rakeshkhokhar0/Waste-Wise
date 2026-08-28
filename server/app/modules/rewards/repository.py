from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.rewards.models import (
    RewardTransaction,
    RewardTransactionType,
    RewardWallet,
)

from server.app.modules.user.models.user_model import User

from server.app.modules.waste.models import (
    DisposalStep,
    WasteAnalysis,
    WasteCategoryResult,
)


class RewardRepository:
    """
    Repository layer for the Rewards module.

    Responsibilities:
        - Reward wallet operations
        - Add/spend reward points
        - Reward transaction operations
        - Reward history
        - Reward summary
        - Reward statistics
        - Leaderboard
        - User rank
        - Reward duplicate checks
        - Analysis reward information

    This repository does not contain reward business rules.
    This repository does not commit transactions.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    # ========================================================
    # REWARD WALLET
    # ========================================================

    async def get_reward_wallet(
        self,
        user_id: UUID,
    ) -> RewardWallet | None:
        """
        Get the reward wallet of a user.
        """

        result = await self.session.execute(
            select(RewardWallet).where(
                RewardWallet.user_id == user_id
            )
        )

        return result.scalar_one_or_none()

    async def create_reward_wallet(
        self,
        user_id: UUID,
    ) -> RewardWallet:
        """
        Create a reward wallet for a user.
        """

        wallet = RewardWallet(
            user_id=user_id,
            total_earned_points=0,
            total_spent_points=0,
            balance_points=0,
        )

        self.session.add(wallet)

        await self.session.flush()

        return wallet

    async def get_or_create_reward_wallet(
        self,
        user_id: UUID,
    ) -> RewardWallet:
        """
        Get user's wallet or create one if it does not exist.
        """

        wallet = await self.get_reward_wallet(
            user_id=user_id,
        )

        if wallet is not None:
            return wallet

        return await self.create_reward_wallet(
            user_id=user_id,
        )

    # ========================================================
    # ADD REWARD POINTS
    # ========================================================

    async def add_reward_points(
        self,
        user_id: UUID,
        points: int,
        transaction_type: RewardTransactionType,
        description: str,
        *,
        disposal_step_id: UUID | None = None,
        waste_category_result_id: UUID | None = None,
        waste_analysis_id: UUID | None = None,
    ) -> RewardTransaction:
        """
        Add reward points to a user's wallet and create
        a corresponding transaction.
        """

        if points <= 0:
            raise ValueError(
                "Reward points must be greater than zero."
            )

        wallet = await self.get_or_create_reward_wallet(
            user_id=user_id,
        )

        wallet.total_earned_points = (
            int(wallet.total_earned_points or 0) + points
        )

        wallet.balance_points = (
            int(wallet.balance_points or 0) + points
        )

        transaction = RewardTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            disposal_step_id=disposal_step_id,
            waste_category_result_id=waste_category_result_id,
            waste_analysis_id=waste_analysis_id,
            transaction_type=transaction_type,
            points=points,
            description=description,
        )

        self.session.add(transaction)

        await self.session.flush()

        return transaction

    # ========================================================
    # SPEND REWARD POINTS
    # ========================================================

    async def spend_reward_points(
        self,
        user_id: UUID,
        points: int,
        description: str,
    ) -> RewardTransaction:
        """
        Spend reward points from a user's wallet.
        """

        if points <= 0:
            raise ValueError(
                "Points to spend must be greater than zero."
            )

        wallet = await self.get_reward_wallet(
            user_id=user_id,
        )

        if wallet is None:
            raise ValueError(
                "Reward wallet not found."
            )

        balance = int(
            wallet.balance_points or 0
        )

        if balance < points:
            raise ValueError(
                "Insufficient reward points."
            )

        wallet.total_spent_points = (
            int(wallet.total_spent_points or 0) + points
        )

        wallet.balance_points = balance - points

        transaction = RewardTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            transaction_type=(
                RewardTransactionType.MARKETPLACE_REDEMPTION
            ),
            points=-points,
            description=description,
        )

        self.session.add(transaction)

        await self.session.flush()

        return transaction

    # ========================================================
    # TOTAL POINTS
    # ========================================================

    async def get_total_points(
        self,
        user_id: UUID,
    ) -> int:
        """
        Get current available reward points.
        """

        wallet = await self.get_reward_wallet(
            user_id=user_id,
        )

        if wallet is None:
            return 0

        return int(
            wallet.balance_points or 0
        )

    # ========================================================
    # TRANSACTIONS
    # ========================================================

    async def get_reward_transactions(
        self,
        user_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> list[RewardTransaction]:
        """
        Get reward transactions for a user.
        """

        if limit < 1:
            raise ValueError(
                "Limit must be greater than zero."
            )

        if offset < 0:
            raise ValueError(
                "Offset cannot be negative."
            )

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id
            )
            .order_by(
                RewardTransaction.created_at.desc()
            )
            .offset(offset)
            .limit(limit)
        )

        return list(
            result.scalars().all()
        )

    async def get_reward_history(
        self,
        user_id: UUID,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[RewardTransaction], int]:
        """
        Get paginated reward transaction history.
        """

        if page < 1:
            raise ValueError(
                "Page must be greater than or equal to 1."
            )

        if page_size < 1 or page_size > 100:
            raise ValueError(
                "Page size must be between 1 and 100."
            )

        # ----------------------------------------------------
        # Total transaction count
        # ----------------------------------------------------

        count_result = await self.session.execute(
            select(
                func.count(RewardTransaction.id)
            ).where(
                RewardTransaction.user_id == user_id
            )
        )

        total = int(
            count_result.scalar_one() or 0
        )

        # ----------------------------------------------------
        # Paginated transactions
        # ----------------------------------------------------

        offset = (page - 1) * page_size

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id
            )
            .order_by(
                RewardTransaction.created_at.desc()
            )
            .offset(offset)
            .limit(page_size)
        )

        transactions = list(
            result.scalars().all()
        )

        return transactions, total

    # ========================================================
    # ANALYSIS REWARD CHECK
    # ========================================================

    async def get_analysis_reward_transaction(
        self,
        user_id: UUID,
        analysis_id: UUID,
    ) -> RewardTransaction | None:
        """
        Check whether the user has already received the
        reward for successfully analyzing this image.
        """

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_analysis_id == analysis_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_REWARD,
            )
            .limit(1)
        )

        return result.scalar_one_or_none()

    # ========================================================
    # STEP REWARD CHECK
    # ========================================================

    async def get_step_reward_transaction(
        self,
        user_id: UUID,
        step_id: UUID,
    ) -> RewardTransaction | None:
        """
        Check whether the user has already received the
        reward for completing this disposal step.
        """

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.disposal_step_id == step_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.STEP_COMPLETION,
            )
            .limit(1)
        )

        return result.scalar_one_or_none()

    # ========================================================
    # CATEGORY REWARD CHECK
    # ========================================================

    async def get_category_completion_reward(
        self,
        user_id: UUID,
        category_id: UUID,
    ) -> RewardTransaction | None:
        """
        Check whether the user has already received the
        completion bonus for a category.
        """

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_category_result_id
                == category_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.CATEGORY_COMPLETION,
            )
            .limit(1)
        )

        return result.scalar_one_or_none()

    # ========================================================
    # ANALYSIS COMPLETION BONUS CHECK
    # ========================================================

    async def get_analysis_completion_reward(
        self,
        user_id: UUID,
        analysis_id: UUID,
    ) -> RewardTransaction | None:
        """
        Check whether the user has already received the
        final analysis completion bonus.
        """

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_analysis_id == analysis_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_COMPLETION,
            )
            .limit(1)
        )

        return result.scalar_one_or_none()

    # ========================================================
    # REWARD SUMMARY
    # ========================================================

    async def get_reward_summary(
        self,
        user_id: UUID,
    ) -> dict:
        """
        Get basic reward summary for a user.
        """

        wallet = await self.get_reward_wallet(
            user_id=user_id,
        )

        if wallet is None:
            total_points = 0
            total_earned = 0
        else:
            total_points = int(
                wallet.balance_points or 0
            )

            total_earned = int(
                wallet.total_earned_points or 0
            )

        # ----------------------------------------------------
        # Transaction count
        # ----------------------------------------------------

        transaction_count_result = await self.session.execute(
            select(
                func.count(RewardTransaction.id)
            ).where(
                RewardTransaction.user_id == user_id
            )
        )

        total_transactions = int(
            transaction_count_result.scalar_one() or 0
        )

        return {
            "user_id": user_id,
            "total_points": total_points,
            "total_earned": total_earned,
            "total_transactions": total_transactions,
        }

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

        wallet = await self.get_reward_wallet(
            user_id=user_id,
        )

        if wallet is None:
            total_earned = 0
            total_spent = 0
            balance = 0
        else:
            total_earned = int(
                wallet.total_earned_points or 0
            )

            total_spent = int(
                wallet.total_spent_points or 0
            )

            balance = int(
                wallet.balance_points or 0
            )

        # ----------------------------------------------------
        # Analysis reward points
        # ----------------------------------------------------

        analysis_reward_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_REWARD,
            )
        )

        # ----------------------------------------------------
        # Step completion points
        # ----------------------------------------------------

        step_points_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.STEP_COMPLETION,
            )
        )

        # ----------------------------------------------------
        # Category completion points
        # ----------------------------------------------------

        category_points_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.CATEGORY_COMPLETION,
            )
        )

        # ----------------------------------------------------
        # Analysis completion points
        # ----------------------------------------------------

        analysis_completion_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_COMPLETION,
            )
        )

        # ----------------------------------------------------
        # Completed disposal steps
        # ----------------------------------------------------

        completed_steps_result = await self.session.execute(
            select(
                func.count(
                    func.distinct(
                        RewardTransaction.disposal_step_id
                    )
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.STEP_COMPLETION,
                RewardTransaction.disposal_step_id.is_not(None),
            )
        )

        # ----------------------------------------------------
        # Completed categories
        # ----------------------------------------------------

        completed_categories_result = await self.session.execute(
            select(
                func.count(
                    func.distinct(
                        RewardTransaction.waste_category_result_id
                    )
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.CATEGORY_COMPLETION,
                RewardTransaction.waste_category_result_id.is_not(
                    None
                ),
            )
        )

        # ----------------------------------------------------
        # Completed analyses
        # ----------------------------------------------------

        completed_analyses_result = await self.session.execute(
            select(
                func.count(
                    func.distinct(
                        RewardTransaction.waste_analysis_id
                    )
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_COMPLETION,
                RewardTransaction.waste_analysis_id.is_not(None),
            )
        )

        return {
            "user_id": user_id,
            "total_points": balance,
            "total_earned": total_earned,

            "analysis_reward_points": max(
                int(
                    analysis_reward_result.scalar_one() or 0
                ),
                0,
            ),

            "step_completion_points": max(
                int(
                    step_points_result.scalar_one() or 0
                ),
                0,
            ),

            "category_completion_points": max(
                int(
                    category_points_result.scalar_one() or 0
                ),
                0,
            ),

            "analysis_completion_points": max(
                int(
                    analysis_completion_result.scalar_one() or 0
                ),
                0,
            ),

            "total_completed_steps": int(
                completed_steps_result.scalar_one() or 0
            ),

            "completed_categories": int(
                completed_categories_result.scalar_one() or 0
            ),

            "completed_analyses": int(
                completed_analyses_result.scalar_one() or 0
            ),

            "total_spent_points": total_spent,
        }

    # ========================================================
    # LEADERBOARD
    # ========================================================

    async def get_leaderboard(
        self,
        limit: int = 10,
    ) -> list[dict]:
        """
        Get users ranked by current reward balance.
        """

        if limit < 1 or limit > 100:
            raise ValueError(
                "Limit must be between 1 and 100."
            )

        result = await self.session.execute(
            select(
                RewardWallet,
                User.user_name,
            )
            .join(
                User,
                User.id == RewardWallet.user_id,
            )
            .order_by(
                RewardWallet.balance_points.desc(),
                RewardWallet.created_at.asc(),
            )
            .limit(limit)
        )

        rows = result.all()

        return [
            {
                "rank": rank,
                "user_id": wallet.user_id,
                "user_name": user_name,
                "total_points": int(
                    wallet.balance_points or 0
                ),
            }
            for rank, (wallet, user_name) in enumerate(
                rows,
                start=1,
            )
        ]

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

        wallet = await self.get_reward_wallet(
            user_id=user_id,
        )

        if wallet is None:
            return None

        current_points = int(
            wallet.balance_points or 0
        )

        result = await self.session.execute(
            select(
                func.count(RewardWallet.id)
            ).where(
                RewardWallet.balance_points
                > current_points
            )
        )

        rank = int(
            result.scalar_one() or 0
        ) + 1

        return {
            "user_id": user_id,
            "rank": rank,
            "total_points": current_points,
        }

    # ========================================================
    # ANALYSIS REWARDS
    # ========================================================

    async def get_analysis_rewards(
        self,
        user_id: UUID,
        analysis_id: UUID,
    ) -> dict:
        """
        Get all rewards associated with one waste analysis.
        """

        # ----------------------------------------------------
        # Verify analysis ownership
        # ----------------------------------------------------

        analysis_result = await self.session.execute(
            select(WasteAnalysis).where(
                WasteAnalysis.id == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
        )

        analysis = (
            analysis_result.scalar_one_or_none()
        )

        if analysis is None:
            raise ValueError(
                "Waste analysis not found."
            )

        # ----------------------------------------------------
        # Analysis reward
        # ----------------------------------------------------

        analysis_reward_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_analysis_id
                == analysis_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_REWARD,
            )
        )

        # ----------------------------------------------------
        # Step points
        # ----------------------------------------------------

        step_points_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_analysis_id
                == analysis_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.STEP_COMPLETION,
            )
        )

        # ----------------------------------------------------
        # Category completion bonuses
        # ----------------------------------------------------

        category_bonus_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_analysis_id
                == analysis_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.CATEGORY_COMPLETION,
            )
        )

        # ----------------------------------------------------
        # Final analysis completion bonus
        # ----------------------------------------------------

        completion_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        RewardTransaction.points
                    ),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_analysis_id
                == analysis_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_COMPLETION,
            )
        )

        # ----------------------------------------------------
        # All transactions for this analysis
        # ----------------------------------------------------

        transaction_result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.waste_analysis_id
                == analysis_id,
            )
            .order_by(
                RewardTransaction.created_at.asc()
            )
        )

        analysis_reward = max(
            int(
                analysis_reward_result.scalar_one() or 0
            ),
            0,
        )

        step_points = max(
            int(
                step_points_result.scalar_one() or 0
            ),
            0,
        )

        category_bonus = max(
            int(
                category_bonus_result.scalar_one() or 0
            ),
            0,
        )

        completion_bonus = max(
            int(
                completion_result.scalar_one() or 0
            ),
            0,
        )

        return {
            "analysis_id": analysis_id,
            "user_id": user_id,
            "analysis_reward": analysis_reward,
            "step_points": step_points,
            "category_bonus": category_bonus,
            "completion_bonus": completion_bonus,
            "total_points": (
                analysis_reward
                + step_points
                + category_bonus
                + completion_bonus
            ),
            "transactions": list(
                transaction_result.scalars().all()
            ),
        }