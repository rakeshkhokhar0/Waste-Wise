# server/app/modules/waste/services/disposal_services.py

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.waste.models import (
    DisposalStep,
    WasteAnalysis,
    WasteAnalysisStatus,
)
from server.app.modules.waste.repository import WasteRepository


class DisposalServiceError(Exception):
    """Base exception for disposal-step operations."""

    pass


class DisposalService:
    """
    Service layer for disposal steps.

    Responsibilities:
        - Validate AI-generated disposal instructions
        - Create disposal steps
        - Fetch disposal steps
        - Update disposal-step completion
        - Calculate disposal progress
        - Check category completion
        - Check analysis completion
        - Delete disposal steps

    Rewards are handled entirely by the Rewards module.
    """

    MAX_DISPOSAL_STEPS = 15
    MAX_INSTRUCTION_LENGTH = 500

    def __init__(
        self,
        session: AsyncSession,
        waste_repository: WasteRepository,
    ):
        self.session = session
        self.waste_repository = waste_repository

    # ========================================================
    # CREATE DISPOSAL STEPS FROM AI
    # ========================================================

    async def create_steps_from_ai(
        self,
        category_result_id: UUID,
        disposal_steps: list[str],
    ) -> list[DisposalStep]:

        validated_steps = self._validate_disposal_steps(
            disposal_steps
        )

        return await self.waste_repository.create_disposal_steps(
            category_result_id=category_result_id,
            instructions=validated_steps,
        )

    # ========================================================
    # VALIDATE DISPOSAL STEPS
    # ========================================================

    def _validate_disposal_steps(
        self,
        disposal_steps: list[str],
    ) -> list[str]:

        if not disposal_steps:
            raise ValueError(
                "At least one disposal step is required."
            )

        if len(disposal_steps) > self.MAX_DISPOSAL_STEPS:
            raise ValueError(
                f"Maximum {self.MAX_DISPOSAL_STEPS} disposal "
                "steps are allowed."
            )

        validated_steps: list[str] = []
        seen_steps: set[str] = set()

        for step in disposal_steps:

            if not isinstance(step, str):
                raise ValueError(
                    "Each disposal step must be a string."
                )

            normalized_step = " ".join(
                step.strip().split()
            )

            if not normalized_step:
                raise ValueError(
                    "Disposal instructions cannot be empty."
                )

            if len(normalized_step) > self.MAX_INSTRUCTION_LENGTH:
                raise ValueError(
                    "A disposal instruction exceeds the "
                    f"{self.MAX_INSTRUCTION_LENGTH} character limit."
                )

            key = normalized_step.casefold()

            if key in seen_steps:
                continue

            seen_steps.add(key)
            validated_steps.append(normalized_step)

        if not validated_steps:
            raise ValueError(
                "No valid disposal steps were provided."
            )

        return validated_steps

    # ========================================================
    # GET DISPOSAL STEPS
    # ========================================================

    async def get_steps(
        self,
        category_result_id: UUID,
    ) -> list[DisposalStep]:

        try:
            return await self.waste_repository.get_disposal_steps(
                category_result_id=category_result_id
            )

        except Exception as exc:
            await self.session.rollback()

            raise DisposalServiceError(
                "Failed to fetch disposal steps."
            ) from exc

    # ========================================================
    # UPDATE STEP COMPLETION
    # ========================================================

    async def update_step_completion(
        self,
        step: DisposalStep,
        is_completed: bool,
    ) -> DisposalStep:

        try:
            await self.waste_repository.update_step_completion(
                step=step,
                is_completed=is_completed,
            )

            await self.session.commit()

            return step

        except Exception as exc:
            await self.session.rollback()

            raise DisposalServiceError(
                "Failed to update disposal step."
            ) from exc

    # ========================================================
    # COMPLETE STEP + CHECK ANALYSIS
    # ========================================================

    async def complete_step_and_check_analysis(
        self,
        step: DisposalStep,
        analysis: WasteAnalysis,
    ) -> WasteAnalysis:

        try:
            await self.waste_repository.update_step_completion(
                step=step,
                is_completed=True,
            )

            all_steps = self._get_all_steps(analysis)

            (
                total_steps,
                completed_steps,
                _,
            ) = self.calculate_progress(all_steps)

            if (
                total_steps > 0
                and completed_steps == total_steps
            ):
                analysis.status = (
                    WasteAnalysisStatus.COMPLETED
                )
            else:
                analysis.status = (
                    WasteAnalysisStatus.IN_PROGRESS
                )

            await self.session.flush()
            await self.session.commit()

            return analysis

        except Exception as exc:
            await self.session.rollback()

            raise DisposalServiceError(
                "Failed to complete disposal step."
            ) from exc

    # ========================================================
    # CALCULATE PROGRESS
    # ========================================================

    def calculate_progress(
        self,
        steps: list[DisposalStep],
    ) -> tuple[int, int, float]:

        total_steps = len(steps)

        if total_steps == 0:
            return 0, 0, 0.0

        completed_steps = sum(
            1
            for step in steps
            if step.is_completed
        )

        percentage = (
            completed_steps / total_steps
        ) * 100

        return (
            total_steps,
            completed_steps,
            round(percentage, 2),
        )

    # ========================================================
    # GET ALL STEPS
    # ========================================================

    @staticmethod
    def _get_all_steps(
        analysis: WasteAnalysis,
    ) -> list[DisposalStep]:

        all_steps: list[DisposalStep] = []

        for category_result in analysis.category_results:
            all_steps.extend(
                category_result.disposal_steps
            )

        return all_steps

    # ========================================================
    # CHECK CATEGORY COMPLETION
    # ========================================================

    def is_category_completed(
        self,
        steps: list[DisposalStep],
    ) -> bool:

        if not steps:
            return False

        return all(
            step.is_completed
            for step in steps
        )

    # ========================================================
    # CHECK ANALYSIS COMPLETION
    # ========================================================

    def is_analysis_completed(
        self,
        analysis: WasteAnalysis,
    ) -> bool:

        all_steps = self._get_all_steps(analysis)

        if not all_steps:
            return False

        return all(
            step.is_completed
            for step in all_steps
        )

    # ========================================================
    # DELETE DISPOSAL STEP
    # ========================================================

    async def delete_step(
        self,
        step: DisposalStep,
    ) -> None:

        try:
            await self.waste_repository.delete_disposal_step(
                step=step
            )

            await self.session.commit()

        except Exception as exc:
            await self.session.rollback()

            raise DisposalServiceError(
                "Failed to delete disposal step."
            ) from exc