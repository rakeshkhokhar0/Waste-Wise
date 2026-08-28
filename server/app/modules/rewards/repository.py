# server/app/modules/waste/repository.py

from datetime import date, datetime, time
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.app.modules.waste.models import (
    DisposalStep,
    RewardTransaction,
    RewardWallet,
    WasteAnalysis,
    WasteAnalysisStatus,
    WasteCategory,
    WasteCategoryResult,
    RewardStepType,
    RewardTransactionType,
)


class WasteRepository:
    """
    Repository layer for the Waste module.

    Responsibilities:
        - Waste analysis database operations
        - Waste category database operations
        - Disposal-step database operations
        - Reward wallet database operations
        - Reward transaction database operations

    This class does NOT own commits.
    Transaction ownership belongs to the service layer.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    # ========================================================
    # WASTE ANALYSIS
    # ========================================================

    async def create_analysis(
        self,
        user_id: UUID,
        image_url: str,
        status: WasteAnalysisStatus = WasteAnalysisStatus.PENDING,
        ai_summary: str | None = None,
    ) -> WasteAnalysis:

        analysis = WasteAnalysis(
            user_id=user_id,
            image_url=image_url,
            status=status,
            ai_summary=ai_summary,
        )

        self.session.add(analysis)
        await self.session.flush()

        return analysis

    # ========================================================
    # CREATE CATEGORY RESULT
    # ========================================================

    async def create_category_result(
        self,
        waste_analysis_id: UUID,
        category: WasteCategory,
        items: list,
        confidence: float | None = None,
    ) -> WasteCategoryResult:

        category_result = WasteCategoryResult(
            waste_analysis_id=waste_analysis_id,
            category=category,
            items=items,
            confidence=confidence,
        )

        self.session.add(category_result)
        await self.session.flush()

        return category_result

    # ========================================================
    # GET ANALYSIS WITH DETAILS
    # ========================================================

    async def get_analysis_with_details(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> WasteAnalysis | None:

        result = await self.session.execute(
            select(WasteAnalysis)
            .where(
                WasteAnalysis.id == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
            .options(
                selectinload(
                    WasteAnalysis.category_results
                ).selectinload(
                    WasteCategoryResult.disposal_steps
                ),
                selectinload(
                    WasteAnalysis.reward_transactions
                ),
            )
        )

        return result.scalar_one_or_none()

    # ========================================================
    # GET DISPOSAL STEP
    # ========================================================

    async def get_disposal_step_by_id(
        self,
        step_id: UUID,
        category_result_id: UUID,
        analysis_id: UUID,
        user_id: UUID,
    ) -> DisposalStep | None:

        result = await self.session.execute(
            select(DisposalStep)
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
                DisposalStep.waste_category_result_id
                == category_result_id,
                WasteCategoryResult.waste_analysis_id
                == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
        )

        return result.scalar_one_or_none()

    # ========================================================
    # CREATE DISPOSAL STEPS
    # ========================================================

    async def create_disposal_steps(
        self,
        category_result_id: UUID,
        instructions: list[str],
    ) -> list[DisposalStep]:

        steps: list[DisposalStep] = []

        for index, instruction in enumerate(
            instructions,
            start=1,
        ):

            reward_step_type = self._determine_reward_step_type(
                instruction=instruction,
                step_number=index,
                total_steps=len(instructions),
            )

            reward_points = self._get_reward_points(
                reward_step_type
            )

            step = DisposalStep(
                waste_category_result_id=category_result_id,
                step_number=index,
                instruction=instruction,
                is_completed=False,
                completed_at=None,
                reward_step_type=reward_step_type,
                reward_points=reward_points,
                reward_awarded=False,
                reward_awarded_at=None,
            )

            self.session.add(step)
            steps.append(step)

        await self.session.flush()

        return steps

    # ========================================================
    # REWARD STEP CLASSIFICATION
    # ========================================================

    @staticmethod
    def _determine_reward_step_type(
        instruction: str,
        step_number: int,
        total_steps: int,
    ) -> RewardStepType:

        text = instruction.casefold()

        complex_keywords = (
            "decompose",
            "decomposing",
            "disassemble",
            "dismantle",
            "authorized",
            "collection center",
            "hazardous",
            "electronic waste",
            "e-waste",
            "take to",
            "special facility",
            "specialist",
        )

        important_keywords = (
            "remove",
            "separate",
            "sort",
            "clean",
            "wash",
            "rinse",
            "dispose",
            "drop off",
        )

        if any(
            keyword in text
            for keyword in complex_keywords
        ):
            return RewardStepType.COMPLEX

        if any(
            keyword in text
            for keyword in important_keywords
        ):
            return RewardStepType.IMPORTANT

        if total_steps >= 5 and step_number in (
            total_steps - 1,
            total_steps,
        ):
            return RewardStepType.IMPORTANT

        if step_number == 1:
            return RewardStepType.BASIC

        return RewardStepType.NORMAL

    # ========================================================
    # REWARD POINT VALUES
    # ========================================================

    @staticmethod
    def _get_reward_points(
        reward_step_type: RewardStepType,
    ) -> int:

        points = {
            RewardStepType.BASIC: 5,
            RewardStepType.NORMAL: 10,
            RewardStepType.IMPORTANT: 15,
            RewardStepType.COMPLEX: 25,
        }

        return points[reward_step_type]

    # ========================================================
    # GET ALL DISPOSAL STEPS
    # ========================================================

    async def get_disposal_steps(
        self,
        category_result_id: UUID,
    ) -> list[DisposalStep]:

        result = await self.session.execute(
            select(DisposalStep)
            .where(
                DisposalStep.waste_category_result_id
                == category_result_id
            )
            .order_by(
                DisposalStep.step_number
            )
        )

        return list(result.scalars().all())

    # ========================================================
    # UPDATE STEP COMPLETION
    # ========================================================

    async def update_step_completion(
        self,
        step: DisposalStep,
        is_completed: bool,
    ) -> DisposalStep:

        step.is_completed = is_completed

        if is_completed:
            step.completed_at = datetime.utcnow()
        else:
            step.completed_at = None

        await self.session.flush()

        return step

    # ========================================================
    # DELETE DISPOSAL STEP
    # ========================================================

    async def delete_disposal_step(
        self,
        step: DisposalStep,
    ) -> None:

        await self.session.delete(step)
        await self.session.flush()

    # ========================================================
    # GET HISTORY
    # ========================================================

    async def get_history(
        self,
        user_id: UUID,
        *,
        category: WasteCategory | None = None,
        status: WasteAnalysisStatus | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[WasteAnalysis], int]:

        conditions = [
            WasteAnalysis.user_id == user_id
        ]

        if status is not None:
            conditions.append(
                WasteAnalysis.status == status
            )

        if category is not None:
            conditions.append(
                WasteAnalysis.category_results.any(
                    WasteCategoryResult.category == category
                )
            )

        if start_date is not None:
            start_datetime = datetime.combine(
                start_date,
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at >= start_datetime
            )

        if end_date is not None:
            end_datetime = datetime.combine(
                end_date,
                time.max,
            )

            conditions.append(
                WasteAnalysis.created_at <= end_datetime
            )

        count_query = (
            select(func.count(WasteAnalysis.id))
            .where(*conditions)
        )

        count_result = await self.session.execute(
            count_query
        )

        total = count_result.scalar_one()

        offset = (
            (page - 1)
            * page_size
        )

        query = (
            select(WasteAnalysis)
            .where(*conditions)
            .options(
                selectinload(
                    WasteAnalysis.category_results
                ).selectinload(
                    WasteCategoryResult.disposal_steps
                )
            )
            .order_by(
                WasteAnalysis.created_at.desc()
            )
            .offset(offset)
            .limit(page_size)
        )

        result = await self.session.execute(query)

        analyses = list(
            result.scalars().unique().all()
        )

        return analyses, total

    # ========================================================
    # GET RECENT ANALYSES
    # ========================================================

    async def get_recent_analyses(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[WasteAnalysis]:

        result = await self.session.execute(
            select(WasteAnalysis)
            .where(
                WasteAnalysis.user_id == user_id
            )
            .options(
                selectinload(
                    WasteAnalysis.category_results
                ).selectinload(
                    WasteCategoryResult.disposal_steps
                )
            )
            .order_by(
                WasteAnalysis.created_at.desc()
            )
            .limit(limit)
        )

        return list(
            result.scalars().unique().all()
        )

    # ========================================================
    # DELETE ANALYSIS
    # ========================================================

    async def delete_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> bool:

        result = await self.session.execute(
            select(WasteAnalysis)
            .where(
                WasteAnalysis.id == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
        )

        analysis = result.scalar_one_or_none()

        if analysis is None:
            return False

        await self.session.delete(analysis)
        await self.session.flush()

        return True

    # ========================================================
    # REWARD WALLET
    # ========================================================

    async def get_reward_wallet(
        self,
        user_id: UUID,
    ) -> RewardWallet | None:

        result = await self.session.execute(
            select(RewardWallet)
            .where(
                RewardWallet.user_id == user_id
            )
        )

        return result.scalar_one_or_none()

    # ========================================================
    # CREATE REWARD WALLET
    # ========================================================

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

    # ========================================================
    # GET OR CREATE REWARD WALLET
    # ========================================================

    async def get_or_create_reward_wallet(
        self,
        user_id: UUID,
    ) -> RewardWallet:

        wallet = await self.get_reward_wallet(
            user_id=user_id
        )

        if wallet is not None:
            return wallet

        return await self.create_reward_wallet(
            user_id=user_id
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
        waste_analysis_id: UUID | None = None,
    ) -> RewardTransaction:

        if points <= 0:
            raise ValueError(
                "Reward points must be greater than zero."
            )

        wallet = await self.get_or_create_reward_wallet(
            user_id=user_id
        )

        wallet.total_earned_points += points
        wallet.balance_points += points

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

        wallet = await self.get_reward_wallet(
            user_id=user_id
        )

        if wallet is None:
            raise ValueError(
                "Reward wallet not found."
            )

        if wallet.balance_points < points:
            raise ValueError(
                "Insufficient reward points."
            )

        wallet.total_spent_points += points
        wallet.balance_points -= points

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
    # REWARD TRANSACTION HISTORY
    # ========================================================

    async def get_reward_transactions(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[RewardTransaction]:

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

    # ========================================================
    # CHECK STEP REWARD
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
    # CHECK ANALYSIS COMPLETION REWARD
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
    # GET TOTAL POINTS
    # ========================================================

    async def get_total_points(
        self,
        user_id: UUID,
    ) -> int:
        """
        Return current reward balance.
        """

        wallet = await self.get_reward_wallet(
            user_id=user_id
        )

        if wallet is None:
            return 0

        return int(wallet.balance_points or 0)

    # ========================================================
    # GET REWARD HISTORY
    # ========================================================

    async def get_reward_history(
        self,
        user_id: UUID,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[RewardTransaction], int]:

        offset = (page - 1) * page_size

        count_query = (
            select(func.count(RewardTransaction.id))
            .where(
                RewardTransaction.user_id == user_id
            )
        )

        count_result = await self.session.execute(
            count_query
        )

        total = count_result.scalar_one()

        query = (
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

        result = await self.session.execute(query)

        transactions = list(
            result.scalars().all()
        )

        return transactions, total

    # ========================================================
    # GET REWARD SUMMARY
    # ========================================================

    async def get_reward_summary(
        self,
        user_id: UUID,
    ):

        wallet = await self.get_reward_wallet(
            user_id=user_id
        )

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

        transaction_count = transaction_count_result.scalar_one()

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

        recent_transactions = list(
            recent_result.scalars().all()
        )

        return {
            "user_id": user_id,
            "total_points": total_points,
            "total_earned_points": total_earned,
            "total_spent_points": total_spent,
            "transaction_count": transaction_count,
            "recent_transactions": recent_transactions,
        }

    # ========================================================
    # GET REWARD STATS
    # ========================================================

    async def get_reward_stats(
        self,
        user_id: UUID,
    ):

        wallet = await self.get_reward_wallet(
            user_id=user_id
        )

        if wallet is None:
            return {
                "user_id": user_id,
                "total_earned_points": 0,
                "total_spent_points": 0,
                "balance_points": 0,
            }

        return {
            "user_id": user_id,
            "total_earned_points": int(
                wallet.total_earned_points or 0
            ),
            "total_spent_points": int(
                wallet.total_spent_points or 0
            ),
            "balance_points": int(
                wallet.balance_points or 0
            ),
        }

    # ========================================================
    # GET LEADERBOARD
    # ========================================================

    async def get_leaderboard(
        self,
        limit: int = 10,
    ):

        result = await self.session.execute(
            select(RewardWallet)
            .order_by(
                RewardWallet.balance_points.desc()
            )
            .limit(limit)
        )

        wallets = list(
            result.scalars().all()
        )

        leaderboard = []

        for rank, wallet in enumerate(
            wallets,
            start=1,
        ):
            leaderboard.append(
                {
                    "rank": rank,
                    "user_id": wallet.user_id,
                    "total_points": int(
                        wallet.balance_points or 0
                    ),
                }
            )

        return leaderboard

    # ========================================================
    # GET USER RANK
    # ========================================================

    async def get_user_rank(
        self,
        user_id: UUID,
    ):

        wallet = await self.get_reward_wallet(
            user_id=user_id
        )

        if wallet is None:
            return None

        result = await self.session.execute(
            select(
                func.count(RewardWallet.id)
            ).where(
                RewardWallet.balance_points
                > wallet.balance_points
            )
        )

        users_above = result.scalar_one()

        return users_above + 1