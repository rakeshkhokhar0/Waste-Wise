from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.rewards.models import (
    RewardTransaction,
    RewardTransactionType,
    RewardWallet,
)

from server.app.modules.waste.models import (
    DisposalStep,
    WasteAnalysis,
)


class RewardRepository:
    """
    Repository layer for the Rewards module.

    Responsibilities:
        - Reward wallet operations
        - Reward transaction operations
        - Reward history
        - Reward summary
        - Reward statistics
        - Leaderboard
        - User rank
        - Analysis reward information

    Waste models are imported only because reward transactions
    reference waste analyses and disposal steps.

    This repository does not contain Waste business logic.
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

        wallet = await self.get_reward_wallet(user_id)

        if wallet is not None:
            return wallet

        return await self.create_reward_wallet(user_id)

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
        waste_analysis_id: UUID | None = None,
    ) -> RewardTransaction:

        if points <= 0:
            raise ValueError(
                "Reward points must be greater than zero."
            )

        wallet = await self.get_or_create_reward_wallet(
            user_id
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

        if points <= 0:
            raise ValueError(
                "Points to spend must be greater than zero."
            )

        wallet = await self.get_reward_wallet(user_id)

        if wallet is None:
            raise ValueError("Reward wallet not found.")

        balance = int(wallet.balance_points or 0)

        if balance < points:
            raise ValueError("Insufficient reward points.")

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

        wallet = await self.get_reward_wallet(user_id)

        if wallet is None:
            return 0

        return int(wallet.balance_points or 0)

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

        return list(result.scalars().all())

    async def get_reward_history(
        self,
        user_id: UUID,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[RewardTransaction], int]:

        if page < 1:
            raise ValueError(
                "Page must be greater than or equal to 1."
            )

        if page_size < 1 or page_size > 100:
            raise ValueError(
                "Page size must be between 1 and 100."
            )

        count_result = await self.session.execute(
            select(
                func.count(RewardTransaction.id)
            ).where(
                RewardTransaction.user_id == user_id
            )
        )

        total = int(count_result.scalar_one() or 0)

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

        return list(result.scalars().all()), total

    # ========================================================
    # STEP REWARD CHECK
    # ========================================================

    async def get_step_reward_transaction(
        self,
        step_id: UUID,
    ) -> RewardTransaction | None:

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.disposal_step_id == step_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.STEP_COMPLETION,
            )
            .limit(1)
        )

        return result.scalar_one_or_none()

    # ========================================================
    # ANALYSIS COMPLETION REWARD CHECK
    # ========================================================

    async def get_analysis_completion_reward(
        self,
        analysis_id: UUID,
    ) -> RewardTransaction | None:

        result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.waste_analysis_id
                == analysis_id,
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

        wallet = await self.get_reward_wallet(user_id)

        if wallet is None:
            total_points = 0
            total_earned = 0
            total_spent = 0
        else:
            total_points = int(
                wallet.balance_points or 0
            )
            total_earned = int(
                wallet.total_earned_points or 0
            )
            total_spent = int(
                wallet.total_spent_points or 0
            )

        transaction_count_result = await self.session.execute(
            select(
                func.count(RewardTransaction.id)
            ).where(
                RewardTransaction.user_id == user_id
            )
        )

        transaction_count = int(
            transaction_count_result.scalar_one() or 0
        )

        recent_result = await self.session.execute(
            select(RewardTransaction)
            .where(
                RewardTransaction.user_id == user_id
            )
            .order_by(
                RewardTransaction.created_at.desc()
            )
            .limit(5)
        )

        return {
            "user_id": user_id,
            "total_points": total_points,
            "total_earned": total_earned,
            "total_transactions": transaction_count,
            "recent_transactions": list(
                recent_result.scalars().all()
            ),
        }

    # ========================================================
    # REWARD STATISTICS
    # ========================================================

    async def get_reward_stats(
        self,
        user_id: UUID,
    ) -> dict:

        wallet = await self.get_reward_wallet(user_id)

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

        step_points_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(RewardTransaction.points),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.STEP_COMPLETION,
            )
        )

        analysis_points_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(RewardTransaction.points),
                    0,
                )
            ).where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_COMPLETION,
            )
        )

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
            "step_completion_points": max(
                int(step_points_result.scalar_one() or 0),
                0,
            ),
            "analysis_completion_points": max(
                int(analysis_points_result.scalar_one() or 0),
                0,
            ),
            "total_completed_steps": int(
                completed_steps_result.scalar_one() or 0
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

        if limit < 1 or limit > 100:
            raise ValueError(
                "Limit must be between 1 and 100."
            )

        result = await self.session.execute(
            select(RewardWallet)
            .order_by(
                RewardWallet.balance_points.desc()
            )
            .limit(limit)
        )

        wallets = list(result.scalars().all())

        return [
            {
                "rank": rank,
                "user_id": wallet.user_id,
                "user_name": str(wallet.user_id),
                "total_points": int(
                    wallet.balance_points or 0
                ),
            }
            for rank, wallet in enumerate(
                wallets,
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

        wallet = await self.get_reward_wallet(user_id)

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

        return {
            "user_id": user_id,
            "rank": int(result.scalar_one() or 0) + 1,
            "total_points": current_points,
        }

    # ========================================================
    # REWARDS FOR ONE ANALYSIS
    # ========================================================

    async def get_analysis_rewards(
        self,
        user_id: UUID,
        analysis_id: UUID,
    ) -> dict:

        analysis_result = await self.session.execute(
            select(WasteAnalysis).where(
                WasteAnalysis.id == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
        )

        if analysis_result.scalar_one_or_none() is None:
            raise ValueError(
                "Waste analysis not found."
            )

        step_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(RewardTransaction.points),
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

        completion_result = await self.session.execute(
            select(
                func.coalesce(
                    func.sum(RewardTransaction.points),
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

        step_points = max(
            int(step_result.scalar_one() or 0),
            0,
        )

        completion_bonus = max(
            int(completion_result.scalar_one() or 0),
            0,
        )

        return {
            "analysis_id": analysis_id,
            "user_id": user_id,
            "step_points": step_points,
            "completion_bonus": completion_bonus,
            "total_points": (
                step_points + completion_bonus
            ),
            "transactions": list(
                transaction_result.scalars().all()
            ),
        }