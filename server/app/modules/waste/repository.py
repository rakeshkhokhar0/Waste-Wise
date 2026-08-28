from datetime import date, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.app.modules.waste.models import (
    DisposalStep,
    RewardStepType,
    RewardTransaction,
    RewardTransactionType,
    RewardWallet,
    WasteAnalysis,
    WasteAnalysisStatus,
    WasteCategory,
    WasteCategoryResult,
)


class WasteRepository:
    """
    Repository layer for the Waste module.

    Responsibilities:
        - Database CRUD operations
        - Waste analysis data
        - Category results
        - Disposal steps
        - Waste history
        - Reward wallet operations
        - Reward transactions
        - Reward statistics
        - Leaderboard
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

        now = datetime.now()

        analysis = WasteAnalysis(
            user_id=user_id,
            image_url=image_url,
            status=status,
            ai_summary=ai_summary,
            created_at=now,
            updated_at=now,
        )

        self.session.add(analysis)
        await self.session.flush()

        return analysis

    async def get_analysis_by_id(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> WasteAnalysis | None:

        stmt = select(WasteAnalysis).where(
            WasteAnalysis.id == analysis_id,
            WasteAnalysis.user_id == user_id,
        )

        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_analysis_with_details(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> WasteAnalysis | None:

        stmt = (
            select(WasteAnalysis)
            .options(
                selectinload(
                    WasteAnalysis.category_results
                ).selectinload(
                    WasteCategoryResult.disposal_steps
                )
            )
            .where(
                WasteAnalysis.id == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
        )

        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def update_analysis(
        self,
        analysis: WasteAnalysis,
        *,
        status: WasteAnalysisStatus | None = None,
        ai_summary: str | None = None,
    ) -> WasteAnalysis:

        if status is not None:
            analysis.status = status

        if ai_summary is not None:
            analysis.ai_summary = ai_summary

        analysis.updated_at = datetime.now()

        await self.session.flush()

        return analysis

    async def delete_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> bool:

        analysis = await self.get_analysis_by_id(
            analysis_id=analysis_id,
            user_id=user_id,
        )

        if analysis is None:
            return False

        await self.session.delete(analysis)
        await self.session.flush()

        return True

    # ========================================================
    # WASTE CATEGORY RESULTS
    # ========================================================

    async def create_category_result(
        self,
        waste_analysis_id: UUID,
        category: WasteCategory,
        items: list[str],
        confidence: float | None = None,
    ) -> WasteCategoryResult:

        now = datetime.now()

        category_result = WasteCategoryResult(
            waste_analysis_id=waste_analysis_id,
            category=category,
            items=items,
            confidence=confidence,
            created_at=now,
            updated_at=now,
        )

        self.session.add(category_result)
        await self.session.flush()

        return category_result

    async def create_category_results(
        self,
        waste_analysis_id: UUID,
        categories: list[dict],
    ) -> list[WasteCategoryResult]:

        now = datetime.now()
        category_results = []

        for category_data in categories:
            category_result = WasteCategoryResult(
                waste_analysis_id=waste_analysis_id,
                category=category_data["category"],
                items=category_data["items"],
                confidence=category_data.get("confidence"),
                created_at=now,
                updated_at=now,
            )

            self.session.add(category_result)
            category_results.append(category_result)

        await self.session.flush()

        return category_results

    async def get_category_by_id(
        self,
        category_id: UUID,
        analysis_id: UUID,
        user_id: UUID,
    ) -> WasteCategoryResult | None:

        stmt = (
            select(WasteCategoryResult)
            .join(
                WasteAnalysis,
                WasteAnalysis.id
                == WasteCategoryResult.waste_analysis_id,
            )
            .where(
                WasteCategoryResult.id == category_id,
                WasteCategoryResult.waste_analysis_id == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
        )

        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_categories_by_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> list[WasteCategoryResult]:

        stmt = (
            select(WasteCategoryResult)
            .join(
                WasteAnalysis,
                WasteAnalysis.id
                == WasteCategoryResult.waste_analysis_id,
            )
            .where(
                WasteCategoryResult.waste_analysis_id == analysis_id,
                WasteAnalysis.user_id == user_id,
            )
            .order_by(WasteCategoryResult.created_at.asc())
        )

        result = await self.session.execute(stmt)

        return list(result.scalars().all())

    async def delete_category(
        self,
        category_result: WasteCategoryResult,
    ) -> None:

        await self.session.delete(category_result)
        await self.session.flush()

    # ========================================================
    # DISPOSAL STEPS
    # ========================================================

    async def create_disposal_step(
        self,
        category_result_id: UUID,
        step_number: int,
        instruction: str,
    ) -> DisposalStep:

        now = datetime.now()

        step = DisposalStep(
            waste_category_result_id=category_result_id,
            step_number=step_number,
            instruction=instruction,
            is_completed=False,
            reward_step_type=RewardStepType.NORMAL,
            reward_points=10,
            reward_awarded=False,
            created_at=now,
            updated_at=now,
        )

        self.session.add(step)
        await self.session.flush()

        return step

    async def create_disposal_steps(
        self,
        category_result_id: UUID,
        instructions: list[str],
    ) -> list[DisposalStep]:

        now = datetime.now()
        steps = []

        for index, instruction in enumerate(
            instructions,
            start=1,
        ):
            step = DisposalStep(
                waste_category_result_id=category_result_id,
                step_number=index,
                instruction=instruction,
                is_completed=False,
                reward_step_type=RewardStepType.NORMAL,
                reward_points=10,
                reward_awarded=False,
                created_at=now,
                updated_at=now,
            )

            self.session.add(step)
            steps.append(step)

        await self.session.flush()

        return steps

    async def get_disposal_step_by_id(
        self,
        step_id: UUID,
        category_result_id: UUID,
        analysis_id: UUID,
        user_id: UUID,
    ) -> DisposalStep | None:

        stmt = (
            select(DisposalStep)
            .options(
                selectinload(
                    DisposalStep.waste_category_result
                ).selectinload(
                    WasteCategoryResult.waste_analysis
                )
            )
            .join(
                WasteCategoryResult,
                WasteCategoryResult.id
                == DisposalStep.waste_category_result_id,
            )
            .join(
                WasteAnalysis,
                WasteAnalysis.id
                == WasteCategoryResult.waste_analysis_id,
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

        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_disposal_steps(
        self,
        category_result_id: UUID,
    ) -> list[DisposalStep]:

        stmt = (
            select(DisposalStep)
            .where(
                DisposalStep.waste_category_result_id
                == category_result_id
            )
            .order_by(
                DisposalStep.step_number.asc()
            )
        )

        result = await self.session.execute(stmt)

        return list(result.scalars().all())

    async def update_step_completion(
        self,
        step: DisposalStep,
        is_completed: bool,
    ) -> DisposalStep:

        now = datetime.now()

        step.is_completed = is_completed
        step.updated_at = now

        if is_completed:
            step.completed_at = now
        else:
            step.completed_at = None

        await self.session.flush()

        return step

    async def delete_disposal_step(
        self,
        step: DisposalStep,
    ) -> None:

        await self.session.delete(step)
        await self.session.flush()

    # ========================================================
    # REWARD WALLET
    # ========================================================

    async def get_or_create_reward_wallet(
        self,
        user_id: UUID,
    ) -> RewardWallet:

        stmt = select(RewardWallet).where(
            RewardWallet.user_id == user_id
        )

        result = await self.session.execute(stmt)

        wallet = result.scalar_one_or_none()

        if wallet is not None:
            return wallet

        wallet = RewardWallet(
            user_id=user_id,
            total_earned_points=0,
            total_spent_points=0,
            balance_points=0,
        )

        self.session.add(wallet)

        await self.session.flush()

        return wallet

    async def add_reward_points(
        self,
        user_id: UUID,
        points: int,
        transaction_type: RewardTransactionType | str,
        description: str,
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
        wallet.updated_at = datetime.now()

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
    # REWARD TRANSACTION CHECKS
    # ========================================================

    async def get_step_reward_transaction(
        self,
        step_id: UUID,
    ) -> RewardTransaction | None:

        stmt = (
            select(RewardTransaction)
            .where(
                RewardTransaction.disposal_step_id == step_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.STEP_COMPLETION,
            )
            .order_by(
                RewardTransaction.created_at.asc()
            )
            .limit(1)
        )

        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_analysis_completion_reward(
        self,
        analysis_id: UUID,
    ) -> RewardTransaction | None:

        stmt = (
            select(RewardTransaction)
            .where(
                RewardTransaction.waste_analysis_id
                == analysis_id,
                RewardTransaction.transaction_type
                == RewardTransactionType.ANALYSIS_COMPLETION,
            )
            .order_by(
                RewardTransaction.created_at.asc()
            )
            .limit(1)
        )

        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    # ========================================================
    # REWARD SUMMARY
    # ========================================================

    async def get_reward_summary(
        self,
        user_id: UUID,
    ) -> dict:

        wallet = await self.get_or_create_reward_wallet(
            user_id=user_id
        )

        return {
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
    # REWARD HISTORY
    # ========================================================

    async def get_reward_history(
        self,
        user_id: UUID,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[RewardTransaction], int]:

        offset = (page - 1) * page_size

        count_stmt = select(
            func.count(RewardTransaction.id)
        ).where(
            RewardTransaction.user_id == user_id
        )

        count_result = await self.session.execute(
            count_stmt
        )

        total = int(
            count_result.scalar_one() or 0
        )

        stmt = (
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

        result = await self.session.execute(stmt)

        transactions = list(
            result.scalars().all()
        )

        return transactions, total

    # ========================================================
    # REWARD STATISTICS
    # ========================================================

    async def get_reward_stats(
        self,
        user_id: UUID,
    ) -> dict:

        wallet = await self.get_or_create_reward_wallet(
            user_id=user_id
        )

        step_stmt = select(
            func.count(RewardTransaction.id)
        ).where(
            RewardTransaction.user_id == user_id,
            RewardTransaction.transaction_type
            == RewardTransactionType.STEP_COMPLETION,
        )

        analysis_stmt = select(
            func.count(RewardTransaction.id)
        ).where(
            RewardTransaction.user_id == user_id,
            RewardTransaction.transaction_type
            == RewardTransactionType.ANALYSIS_COMPLETION,
        )

        step_result = await self.session.execute(
            step_stmt
        )

        analysis_result = await self.session.execute(
            analysis_stmt
        )

        completed_steps = int(
            step_result.scalar_one() or 0
        )

        completed_analyses = int(
            analysis_result.scalar_one() or 0
        )

        return {
            "total_earned_points": int(
                wallet.total_earned_points or 0
            ),
            "total_spent_points": int(
                wallet.total_spent_points or 0
            ),
            "balance_points": int(
                wallet.balance_points or 0
            ),
            "completed_steps": completed_steps,
            "completed_analyses": completed_analyses,
        }

    # ========================================================
    # LEADERBOARD
    # ========================================================

    async def get_leaderboard(
        self,
        *,
        limit: int = 10,
    ) -> list[dict]:

        from server.app.modules.user.models.user_model import User

        stmt = (
            select(
                RewardWallet.user_id,
                User.user_name,
                RewardWallet.total_earned_points,
            )
            .join(
                User,
                User.id == RewardWallet.user_id,
            )
            .order_by(
                RewardWallet.total_earned_points.desc(),
                RewardWallet.user_id.asc(),
            )
            .limit(limit)
        )

        result = await self.session.execute(stmt)

        rows = result.all()

        leaderboard = []

        for rank, row in enumerate(rows, start=1):
            leaderboard.append(
                {
                    "rank": rank,
                    "user_id": row.user_id,
                    "user_name": row.user_name,
                    "total_earned_points": int(
                        row.total_earned_points or 0
                    ),
                }
            )

        return leaderboard

    # ========================================================
    # USER RANK
    # ========================================================

    async def get_user_rank(
        self,
        user_id: UUID,
    ) -> dict | None:

        wallet_stmt = select(
            RewardWallet.total_earned_points
        ).where(
            RewardWallet.user_id == user_id
        )

        wallet_result = await self.session.execute(
            wallet_stmt
        )

        user_points = wallet_result.scalar_one_or_none()

        if user_points is None:
            return None

        rank_stmt = select(
            func.count(RewardWallet.id)
        ).where(
            RewardWallet.total_earned_points
            > user_points
        )

        rank_result = await self.session.execute(
            rank_stmt
        )

        rank = int(
            rank_result.scalar_one() or 0
        ) + 1

        return {
            "user_id": user_id,
            "rank": rank,
            "total_earned_points": int(
                user_points or 0
            ),
        }

    # ========================================================
    # TOTAL POINTS
    # ========================================================

    async def get_total_points(
        self,
        user_id: UUID,
    ) -> int:

        stmt = select(
            RewardWallet.balance_points
        ).where(
            RewardWallet.user_id == user_id
        )

        result = await self.session.execute(stmt)

        points = result.scalar_one_or_none()

        return int(points or 0)

    # ========================================================
    # HISTORY
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

        if category is not None:
            conditions.append(
                WasteCategoryResult.category == category
            )

        if status is not None:
            conditions.append(
                WasteAnalysis.status == status
            )

        if start_date is not None:
            start_datetime = datetime.combine(
                start_date,
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at
                >= start_datetime
            )

        if end_date is not None:
            end_datetime = datetime.combine(
                end_date + timedelta(days=1),
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at
                < end_datetime
            )

        count_stmt = (
            select(
                func.count(
                    func.distinct(WasteAnalysis.id)
                )
            )
            .select_from(WasteAnalysis)
        )

        if category is not None:
            count_stmt = count_stmt.join(
                WasteCategoryResult,
                WasteCategoryResult.waste_analysis_id
                == WasteAnalysis.id,
            )

        count_stmt = count_stmt.where(*conditions)

        count_result = await self.session.execute(
            count_stmt
        )

        total = int(
            count_result.scalar_one() or 0
        )

        stmt = select(WasteAnalysis)

        if category is not None:
            stmt = stmt.join(
                WasteCategoryResult,
                WasteCategoryResult.waste_analysis_id
                == WasteAnalysis.id,
            )

        stmt = (
            stmt.where(*conditions)
            .distinct()
            .order_by(
                WasteAnalysis.created_at.desc()
            )
        )

        offset = (page - 1) * page_size

        stmt = (
            stmt.offset(offset)
            .limit(page_size)
        )

        result = await self.session.execute(stmt)

        analyses = list(
            result.scalars().all()
        )

        return analyses, total

    # ========================================================
    # RECENT HISTORY
    # ========================================================

    async def get_recent_analyses(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[WasteAnalysis]:

        stmt = (
            select(WasteAnalysis)
            .where(
                WasteAnalysis.user_id == user_id
            )
            .order_by(
                WasteAnalysis.created_at.desc()
            )
            .limit(limit)
        )

        result = await self.session.execute(stmt)

        return list(result.scalars().all())

    # ========================================================
    # COUNTS / STATISTICS
    # ========================================================

    async def count_user_analyses(
        self,
        user_id: UUID,
    ) -> int:

        stmt = select(
            func.count(WasteAnalysis.id)
        ).where(
            WasteAnalysis.user_id == user_id
        )

        result = await self.session.execute(stmt)

        return int(
            result.scalar_one() or 0
        )

    async def count_completed_analyses(
        self,
        user_id: UUID,
    ) -> int:

        stmt = select(
            func.count(WasteAnalysis.id)
        ).where(
            WasteAnalysis.user_id == user_id,
            WasteAnalysis.status
            == WasteAnalysisStatus.COMPLETED,
        )

        result = await self.session.execute(stmt)

        return int(
            result.scalar_one() or 0
        )

    # ========================================================
    # CATEGORY STATISTICS
    # ========================================================

    async def get_category_statistics(
        self,
        user_id: UUID,
        *,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[tuple[WasteCategory, int]]:

        conditions = [
            WasteAnalysis.user_id == user_id
        ]

        if start_date is not None:
            start_datetime = datetime.combine(
                start_date,
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at
                >= start_datetime
            )

        if end_date is not None:
            end_datetime = datetime.combine(
                end_date + timedelta(days=1),
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at
                < end_datetime
            )

        stmt = (
            select(
                WasteCategoryResult.category,
                func.count(
                    WasteCategoryResult.id
                ),
            )
            .join(
                WasteAnalysis,
                WasteAnalysis.id
                == WasteCategoryResult.waste_analysis_id,
            )
            .where(*conditions)
            .group_by(
                WasteCategoryResult.category
            )
            .order_by(
                func.count(
                    WasteCategoryResult.id
                ).desc()
            )
        )

        result = await self.session.execute(stmt)

        return list(result.all())