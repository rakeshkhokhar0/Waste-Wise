# Waste data access layer for WasteWise.
# app/modules/waste/repository.py

from datetime import date, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.app.modules.waste.models import (
    DisposalStep,
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
        - Fetching waste analysis data
        - Fetching category results
        - Managing disposal steps
        - Updating weights
        - Waste history and filtering
        - Basic database statistics

    Business logic, AI calls, disposal-rule generation, and
    reward calculation should NOT be implemented here.
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
    ) -> WasteAnalysis:
        """
        Create a new waste analysis.
        """

        now = datetime.now()

        analysis = WasteAnalysis(
            user_id=user_id,
            image_url=image_url,
            status=status,
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
        """
        Get an analysis belonging to a specific user.

        The user_id check prevents one user from accessing
        another user's analysis.
        """

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
        """
        Get one analysis together with:

            WasteAnalysis
                └── Category Results
                        └── Disposal Steps
        """

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
        """
        Update analysis information.
        """

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
        """
        Delete an analysis belonging to a user.

        Child category results and disposal steps are deleted
        through the configured cascade relationships.
        """

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
        """
        Create one category result for an analysis.
        """

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
        """
        Create multiple category results in one operation.

        Expected category format:

            [
                {
                    "category": WasteCategory.RECYCLABLE,
                    "items": ["plastic bottle", "newspaper"],
                    "confidence": 0.96,
                },
                ...
            ]
        """

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
        """
        Get a category result while verifying ownership through
        its parent analysis.
        """

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
        """
        Get all category results belonging to an analysis.
        """

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
        """
        Delete a category result.
        """

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
        """
        Create one disposal step.
        """

        now = datetime.now()

        step = DisposalStep(
            waste_category_result_id=category_result_id,
            step_number=step_number,
            instruction=instruction,
            is_completed=False,
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
        """
        Create multiple disposal steps.

        Step numbers are automatically generated from the
        order of the instructions.
        """

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
        """
        Get one disposal step while validating the complete
        ownership chain:

            User
              ↓
            Analysis
              ↓
            Category
              ↓
            Step
        """

        stmt = (
            select(DisposalStep)
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
        """
        Get all disposal steps for a category.

        Steps are always returned in the correct order.
        """

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
        """
        Mark a disposal step as completed or incomplete.
        """

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
        """
        Delete one disposal step.
        """

        await self.session.delete(step)
        await self.session.flush()

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
        """
        Flexible waste history method.

        Supported filters:

            - category
            - status
            - start_date
            - end_date
            - pagination

        Examples:

            get_history(user_id)

            get_history(
                user_id,
                category=WasteCategory.RECYCLABLE
            )

            get_history(
                user_id,
                status=WasteAnalysisStatus.COMPLETED
            )

            get_history(
                user_id,
                start_date=date(...),
                end_date=date(...)
            )

            get_history(
                user_id,
                category=WasteCategory.E_WASTE,
                status=WasteAnalysisStatus.COMPLETED,
                start_date=date(...),
                end_date=date(...)
            )
        """

        conditions = [
            WasteAnalysis.user_id == user_id
        ]

        # ----------------------------------------------------
        # Category filter
        # ----------------------------------------------------

        if category is not None:
            conditions.append(
                WasteCategoryResult.category == category
            )

        # ----------------------------------------------------
        # Status filter
        # ----------------------------------------------------

        if status is not None:
            conditions.append(
                WasteAnalysis.status == status
            )

        # ----------------------------------------------------
        # Date filters
        # ----------------------------------------------------

        if start_date is not None:
            start_datetime = datetime.combine(
                start_date,
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at >= start_datetime
            )

        if end_date is not None:
            # Use the beginning of the next day so that the
            # entire end_date is included.
            end_datetime = datetime.combine(
                end_date + timedelta(days=1),
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at < end_datetime
            )

        # ----------------------------------------------------
        # Count query
        # ----------------------------------------------------

        count_stmt = (
            select(func.count(func.distinct(WasteAnalysis.id)))
            .select_from(WasteAnalysis)
        )

        if category is not None:
            count_stmt = count_stmt.join(
                WasteCategoryResult,
                WasteCategoryResult.waste_analysis_id
                == WasteAnalysis.id,
            )

        count_stmt = count_stmt.where(*conditions)

        count_result = await self.session.execute(count_stmt)

        total = count_result.scalar_one()

        # ----------------------------------------------------
        # Main history query
        # ----------------------------------------------------

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

        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)

        analyses = list(result.scalars().all())

        return analyses, total

    # ========================================================
    # RECENT HISTORY
    # ========================================================

    async def get_recent_analyses(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[WasteAnalysis]:
        """
        Get the user's most recent waste analyses.
        """

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
        """
        Count total analyses created by a user.
        """

        stmt = select(
            func.count(WasteAnalysis.id)
        ).where(
            WasteAnalysis.user_id == user_id
        )

        result = await self.session.execute(stmt)

        return result.scalar_one()

    async def count_completed_analyses(
        self,
        user_id: UUID,
    ) -> int:
        """
        Count completed waste disposal analyses.
        """

        stmt = select(
            func.count(WasteAnalysis.id)
        ).where(
            WasteAnalysis.user_id == user_id,
            WasteAnalysis.status
            == WasteAnalysisStatus.COMPLETED,
        )

        result = await self.session.execute(stmt)

        return result.scalar_one()

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
        """
        Get number of category occurrences for a user.

        Example result:

            [
                (RECYCLABLE, 15),
                (ORGANIC, 10),
                (E_WASTE, 4),
            ]
        """

        conditions = [
            WasteAnalysis.user_id == user_id
        ]

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
                end_date + timedelta(days=1),
                time.min,
            )

            conditions.append(
                WasteAnalysis.created_at < end_datetime
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
