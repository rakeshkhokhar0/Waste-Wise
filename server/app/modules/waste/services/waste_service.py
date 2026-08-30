# server/app/modules/waste/services/waste_service.py

from datetime import date
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.rewards.service import RewardService
from server.app.modules.waste.models import (
    WasteAnalysis,
    WasteAnalysisStatus,
    WasteCategory,
)
from server.app.modules.waste.repository import WasteRepository
from server.app.modules.waste.services.ai_service import AIService
from server.app.modules.waste.services.disposal_services import DisposalService
from server.app.modules.waste.services.image_services import ImageService


class WasteServiceError(Exception):
    """Base exception for waste service errors."""

    pass


class WasteService:
    def __init__(
        self,
        session: AsyncSession,
        waste_repository: WasteRepository,
        image_service: ImageService,
        ai_service: AIService,
        disposal_service: DisposalService,
        reward_service: RewardService | None = None,
    ):
        self.session = session
        self.waste_repository = waste_repository
        self.image_service = image_service
        self.ai_service = ai_service
        self.disposal_service = disposal_service
        self.reward_service = reward_service

    # ========================================================
    # GET ACTIVE PENDING DISPOSAL
    # ========================================================

    async def get_active_analysis(self, user_id: UUID) -> WasteAnalysis | None:
        """
        Check if user has an unfinished disposal plan in progress.
        Loads eager relationships to prevent greenlet IO errors.
        """
        try:
            analyses, _ = await self.waste_repository.get_history(
                user_id=user_id,
                page=1,
                page_size=10,
            )

            for item in analyses:
                full_analysis = (
                    await self.waste_repository.get_analysis_with_details(
                        analysis_id=item.id,
                        user_id=user_id,
                    )
                )
                if not full_analysis:
                    continue

                if full_analysis.status == WasteAnalysisStatus.IN_PROGRESS:
                    return full_analysis

                all_steps = self.disposal_service._get_all_steps(full_analysis)
                total_steps, completed_steps, _ = (
                    self.disposal_service.calculate_progress(all_steps)
                )

                if total_steps > 0 and completed_steps < total_steps:
                    return full_analysis

            return None
        except Exception as exc:
            raise WasteServiceError(
                f"Failed to check active analysis: {exc}"
            ) from exc

    # ========================================================
    # ANALYZE WASTE IMAGE
    # ========================================================

    async def analyze_waste(
        self,
        user_id: UUID,
        image: UploadFile,
    ) -> WasteAnalysis:
        try:
            uploaded_image = await self.image_service.upload_image(file=image)

            ai_result = await self.ai_service.analyze_image(
                image_url=uploaded_image.url
            )

            analysis = await self.waste_repository.create_analysis(
                user_id=user_id,
                image_url=uploaded_image.url,
                status=WasteAnalysisStatus.IN_PROGRESS,
                ai_summary=ai_result.summary,
            )

            for category_data in ai_result.categories:
                cat_result = await self.waste_repository.create_category_result(
                    waste_analysis_id=analysis.id,
                    category=category_data.category,
                    items=category_data.items,
                    confidence=category_data.confidence,
                )

                if category_data.disposal_steps:
                    await self.disposal_service.create_steps_from_ai(
                        category_result_id=cat_result.id,
                        disposal_steps=category_data.disposal_steps,
                    )

            await self.session.commit()

            return await self.get_analysis(
                analysis_id=analysis.id,
                user_id=user_id,
            )

        except Exception as exc:
            await self.session.rollback()
            raise WasteServiceError(
                f"Failed to analyze waste: {exc}"
            ) from exc

    # ========================================================
    # GET COMPLETE ANALYSIS
    # ========================================================

    async def get_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> WasteAnalysis:
        try:
            analysis = await self.waste_repository.get_analysis_with_details(
                analysis_id=analysis_id,
                user_id=user_id,
            )
            if not analysis:
                raise WasteServiceError("Waste analysis not found.")
            return analysis
        except WasteServiceError:
            raise
        except Exception as exc:
            raise WasteServiceError(
                f"Failed to fetch analysis: {exc}"
            ) from exc

    # ========================================================
    # UPDATE DISPOSAL STEP
    # ========================================================

    async def update_disposal_step(
        self,
        step_id: UUID,
        category_result_id: UUID,
        analysis_id: UUID,
        user_id: UUID,
        is_completed: bool,
    ) -> WasteAnalysis:
        try:
            step = await self.waste_repository.get_disposal_step_by_id(
                step_id=step_id,
                category_result_id=category_result_id,
                analysis_id=analysis_id,
                user_id=user_id,
            )
            if not step:
                raise WasteServiceError("Disposal step not found.")

            # Update step completion
            await self.disposal_service.update_step_completion(
                step=step,
                is_completed=is_completed,
            )

            # Re-fetch the eager analysis to re-calculate completion
            analysis = await self.get_analysis(
                analysis_id=analysis_id,
                user_id=user_id,
            )

            return await self.disposal_service.complete_step_and_check_analysis(
                step=step,
                analysis=analysis,
            )
        except WasteServiceError:
            raise
        except Exception as exc:
            raise WasteServiceError(
                f"Failed to update disposal step: {exc}"
            ) from exc

    # ========================================================
    # HISTORY & RECENT
    # ========================================================

    async def get_history(
        self,
        user_id: UUID,
        category: WasteCategory | None = None,
        status: WasteAnalysisStatus | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[WasteAnalysis], int]:
        try:
            return await self.waste_repository.get_history(
                user_id=user_id,
                category=category,
                status=status,
                start_date=start_date,
                end_date=end_date,
                page=page,
                page_size=page_size,
            )
        except Exception as exc:
            raise WasteServiceError(
                f"Failed to fetch history: {exc}"
            ) from exc

    async def get_recent_analyses(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[WasteAnalysis]:
        try:
            return await self.waste_repository.get_recent_analyses(
                user_id=user_id,
                limit=limit,
            )
        except Exception as exc:
            raise WasteServiceError(
                f"Failed to fetch recent analyses: {exc}"
            ) from exc

    # ========================================================
    # DELETE ANALYSIS
    # ========================================================

    async def delete_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> None:
        try:
            deleted = await self.waste_repository.delete_analysis(
                analysis_id=analysis_id,
                user_id=user_id,
            )
            if not deleted:
                raise WasteServiceError("Waste analysis not found.")
            await self.session.commit()
        except WasteServiceError:
            raise
        except Exception as exc:
            await self.session.rollback()
            raise WasteServiceError(
                f"Failed to delete analysis: {exc}"
            ) from exc