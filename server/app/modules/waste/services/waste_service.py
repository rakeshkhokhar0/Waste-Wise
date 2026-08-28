# server/app/modules/waste/services/waste_service.py

from datetime import date
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.waste.models import (
    RewardTransactionType,
    WasteAnalysis,
    WasteAnalysisStatus,
)
from server.app.modules.waste.repository import WasteRepository
from server.app.modules.waste.schemas import AIWasteAnalysis
from server.app.modules.waste.services.ai_service import AIService
from server.app.modules.waste.services.disposal_services import (
    DisposalService,
)
from server.app.modules.waste.services.image_services import (
    ImageService,
)


# ============================================================
# EXCEPTIONS
# ============================================================


class WasteServiceError(Exception):
    """Base exception for WasteService."""

    pass


class WasteAnalysisError(WasteServiceError):
    """Raised when waste image analysis fails."""

    pass


# ============================================================
# WASTE SERVICE
# ============================================================


class WasteService:
    """
    Main service/orchestrator for the Waste module.

    Responsibilities:
        - Upload waste image
        - Analyze image using AI
        - Create waste analysis
        - Store AI-detected categories
        - Store AI-generated disposal steps
        - Fetch complete analysis
        - Complete disposal steps
        - Award reward points
        - Calculate disposal progress
        - Mark analysis completed
        - Award final completion bonus
        - Fetch waste history
        - Delete waste analysis

    Transaction ownership belongs to this service.
    Repository methods do not commit.
    """

    def __init__(
        self,
        session: AsyncSession,
        waste_repository: WasteRepository,
        image_service: ImageService,
        ai_service: AIService,
        disposal_service: DisposalService,
    ):
        self.session = session
        self.waste_repository = waste_repository
        self.image_service = image_service
        self.ai_service = ai_service
        self.disposal_service = disposal_service

    # ========================================================
    # ANALYZE WASTE IMAGE
    # ========================================================

    async def analyze_waste(
        self,
        user_id: UUID,
        image: UploadFile,
    ) -> WasteAnalysis:
        """
        Complete waste-analysis workflow.

        Flow:

            Upload image
                ↓
            Cloudinary
                ↓
            AI analysis
                ↓
            Create WasteAnalysis
                ↓
            Create categories
                ↓
            Create disposal steps
                ↓
            Commit
        """

        try:
            # ------------------------------------------------
            # 1. Validate uploaded file
            # ------------------------------------------------

            if image is None:
                raise WasteAnalysisError(
                    "Waste image is required."
                )

            if not image.filename:
                raise WasteAnalysisError(
                    "Uploaded image has no filename."
                )

            # ------------------------------------------------
            # 2. Upload image
            # ------------------------------------------------

            uploaded_image = await self.image_service.upload_image(
                file=image,
            )

            if uploaded_image is None:
                raise WasteAnalysisError(
                    "Image upload returned no result."
                )

            # ImageService normally returns an object containing
            # the uploaded image URL.
            image_url = getattr(
                uploaded_image,
                "url",
                None,
            )

            if not image_url:
                raise WasteAnalysisError(
                    "Image upload did not return a valid URL."
                )

            # ------------------------------------------------
            # 3. Analyze image using AI
            # ------------------------------------------------

            ai_result = await self.ai_service.analyze_image(
                image_url=image_url,
            )

            # ------------------------------------------------
            # 4. Validate AI result
            # ------------------------------------------------

            self._validate_ai_result(ai_result)

            # ------------------------------------------------
            # 5. Create analysis
            # ------------------------------------------------

            analysis = await self.waste_repository.create_analysis(
                user_id=user_id,
                image_url=image_url,
                status=WasteAnalysisStatus.IN_PROGRESS,
            )

            if analysis is None:
                raise WasteAnalysisError(
                    "Failed to create waste analysis."
                )

            # ------------------------------------------------
            # 6. Store AI summary
            # ------------------------------------------------

            summary = getattr(
                ai_result,
                "summary",
                None,
            )

            if summary:
                await self.waste_repository.update_analysis(
                    analysis,
                    ai_summary=summary,
                )

            # ------------------------------------------------
            # 7. Create categories and disposal steps
            # ------------------------------------------------

            for category in ai_result.categories:

                category_result = (
                    await self.waste_repository.create_category_result(
                        waste_analysis_id=analysis.id,
                        category=category.category,
                        items=category.items,
                        confidence=category.confidence,
                    )
                )

                if category_result is None:
                    raise WasteAnalysisError(
                        "Failed to create waste category."
                    )

                await self.disposal_service.create_steps_from_ai(
                    category_result_id=category_result.id,
                    disposal_steps=category.disposal_steps,
                )

            # ------------------------------------------------
            # 8. Commit complete workflow
            # ------------------------------------------------

            await self.session.commit()

            # ------------------------------------------------
            # 9. Return complete analysis
            # ------------------------------------------------

            complete_analysis = (
                await self.waste_repository.get_analysis_with_details(
                    analysis_id=analysis.id,
                    user_id=user_id,
                )
            )

            if complete_analysis is None:
                raise WasteAnalysisError(
                    "Waste analysis was created but could "
                    "not be retrieved."
                )

            return complete_analysis

        except WasteAnalysisError:
            await self.session.rollback()
            raise

        except WasteServiceError:
            await self.session.rollback()
            raise

        except Exception as exc:
            await self.session.rollback()

            # Keep the actual error available for debugging.
            raise WasteAnalysisError(
                f"Failed to analyze waste image: {exc}"
            ) from exc

    # ========================================================
    # VALIDATE AI RESULT
    # ========================================================

    @staticmethod
    def _validate_ai_result(
        ai_result: AIWasteAnalysis,
    ) -> None:
        """
        Validate the AI result before storing it.
        """

        if ai_result is None:
            raise WasteAnalysisError(
                "AI analysis returned no result."
            )

        if not ai_result.categories:
            raise WasteAnalysisError(
                "No waste categories were detected in the image."
            )

        for category in ai_result.categories:

            if not category.items:
                raise WasteAnalysisError(
                    "AI returned a waste category without items."
                )

            if not category.disposal_steps:
                raise WasteAnalysisError(
                    "AI returned a waste category without "
                    "disposal steps."
                )

            if category.confidence is not None:
                if not 0 <= category.confidence <= 1:
                    raise WasteAnalysisError(
                        "AI returned an invalid confidence score."
                    )

    # ========================================================
    # GET COMPLETE ANALYSIS
    # ========================================================

    async def get_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> WasteAnalysis:

        try:
            analysis = (
                await self.waste_repository.get_analysis_with_details(
                    analysis_id=analysis_id,
                    user_id=user_id,
                )
            )

            if analysis is None:
                raise WasteServiceError(
                    "Waste analysis not found."
                )

            return analysis

        except WasteServiceError:
            raise

        except Exception as exc:
            await self.session.rollback()

            raise WasteServiceError(
                f"Failed to fetch waste analysis: {exc}"
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
            # ------------------------------------------------
            # 1. Validate disposal-step ownership
            # ------------------------------------------------

            step = (
                await self.waste_repository.get_disposal_step_by_id(
                    step_id=step_id,
                    category_result_id=category_result_id,
                    analysis_id=analysis_id,
                    user_id=user_id,
                )
            )

            if step is None:
                raise WasteServiceError(
                    "Disposal step not found."
                )

            # ------------------------------------------------
            # 2. Get complete analysis
            # ------------------------------------------------

            analysis = (
                await self.waste_repository.get_analysis_with_details(
                    analysis_id=analysis_id,
                    user_id=user_id,
                )
            )

            if analysis is None:
                raise WasteServiceError(
                    "Waste analysis not found."
                )

            # ------------------------------------------------
            # 3. Remember previous state
            # ------------------------------------------------

            was_completed = bool(
                step.is_completed
            )

            # ------------------------------------------------
            # 4. Update step
            # ------------------------------------------------

            await self.waste_repository.update_step_completion(
                step=step,
                is_completed=is_completed,
            )

            # ------------------------------------------------
            # 5. Award reward only on False -> True
            # ------------------------------------------------

            if is_completed and not was_completed:
                await self._award_step_reward(
                    step=step,
                    analysis=analysis,
                )

            # ------------------------------------------------
            # 6. Reload analysis
            # ------------------------------------------------

            analysis = (
                await self.waste_repository.get_analysis_with_details(
                    analysis_id=analysis_id,
                    user_id=user_id,
                )
            )

            if analysis is None:
                raise WasteServiceError(
                    "Waste analysis not found."
                )

            # ------------------------------------------------
            # 7. Get all disposal steps
            # ------------------------------------------------

            all_steps = self._get_all_steps(
                analysis
            )

            # ------------------------------------------------
            # 8. Calculate progress
            # ------------------------------------------------

            (
                total_steps,
                completed_steps,
                _progress_percentage,
            ) = self.disposal_service.calculate_progress(
                steps=all_steps,
            )

            # ------------------------------------------------
            # 9. Update analysis status
            # ------------------------------------------------

            if (
                total_steps > 0
                and completed_steps == total_steps
            ):
                analysis.status = (
                    WasteAnalysisStatus.COMPLETED
                )

                await self._award_final_completion_bonus(
                    analysis=analysis,
                )

            else:
                analysis.status = (
                    WasteAnalysisStatus.IN_PROGRESS
                )

            # ------------------------------------------------
            # 10. Commit
            # ------------------------------------------------

            await self.session.flush()
            await self.session.commit()

            return analysis

        except WasteServiceError:
            await self.session.rollback()
            raise

        except Exception as exc:
            await self.session.rollback()

            raise WasteServiceError(
                f"Failed to update disposal step: {exc}"
            ) from exc

    # ========================================================
    # AWARD STEP REWARD
    # ========================================================

    async def _award_step_reward(
        self,
        step,
        analysis: WasteAnalysis,
    ) -> None:

        if step.reward_awarded:
            return

        existing_reward = (
            await self.waste_repository.get_step_reward_transaction(
                step_id=step.id,
            )
        )

        if existing_reward is not None:
            step.reward_awarded = True
            await self.session.flush()
            return

        points = int(
            step.reward_points or 0
        )

        if points <= 0:
            raise WasteServiceError(
                "Invalid reward points for disposal step."
            )

        await self.waste_repository.add_reward_points(
            user_id=analysis.user_id,
            points=points,
            transaction_type=(
                RewardTransactionType.STEP_COMPLETION
            ),
            description=(
                f"Completed disposal step "
                f"{step.step_number}: "
                f"{step.instruction}"
            ),
            disposal_step_id=step.id,
            waste_analysis_id=analysis.id,
        )

        step.reward_awarded = True

        await self.session.flush()

    # ========================================================
    # AWARD FINAL COMPLETION BONUS
    # ========================================================

    async def _award_final_completion_bonus(
        self,
        analysis: WasteAnalysis,
    ) -> None:

        existing_reward = (
            await self.waste_repository
            .get_analysis_completion_reward(
                analysis_id=analysis.id,
            )
        )

        if existing_reward is not None:
            return

        bonus = int(
            self.disposal_service.FINAL_COMPLETION_BONUS
        )

        if bonus <= 0:
            raise WasteServiceError(
                "Invalid final completion bonus."
            )

        await self.waste_repository.add_reward_points(
            user_id=analysis.user_id,
            points=bonus,
            transaction_type=(
                RewardTransactionType.ANALYSIS_COMPLETION
            ),
            description=(
                "Completed all disposal steps "
                "for a waste analysis."
            ),
            waste_analysis_id=analysis.id,
        )

        await self.session.flush()

    # ========================================================
    # GET ALL STEPS
    # ========================================================

    @staticmethod
    def _get_all_steps(
        analysis: WasteAnalysis,
    ) -> list:

        all_steps = []

        for category_result in analysis.category_results:
            all_steps.extend(
                category_result.disposal_steps
            )

        return all_steps

    # ========================================================
    # GET PROGRESS
    # ========================================================

    def get_analysis_progress(
        self,
        analysis: WasteAnalysis,
    ) -> dict:

        all_steps = self._get_all_steps(
            analysis
        )

        (
            total_steps,
            completed_steps,
            progress_percentage,
        ) = self.disposal_service.calculate_progress(
            steps=all_steps,
        )

        return {
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "remaining_steps": (
                total_steps - completed_steps
            ),
            "progress_percentage": progress_percentage,
            "completed": (
                total_steps > 0
                and completed_steps == total_steps
            ),
        }

    # ========================================================
    # GET REWARD INFORMATION
    # ========================================================

    def get_analysis_rewards(
        self,
        analysis: WasteAnalysis,
    ) -> dict:

        all_steps = self._get_all_steps(
            analysis
        )

        possible_step_points = sum(
            int(step.reward_points or 0)
            for step in all_steps
        )

        earned_step_points = sum(
            int(step.reward_points or 0)
            for step in all_steps
            if step.reward_awarded
        )

        final_bonus = int(
            self.disposal_service.FINAL_COMPLETION_BONUS
        )

        final_bonus_earned = (
            analysis.status
            == WasteAnalysisStatus.COMPLETED
        )

        total_possible_points = (
            possible_step_points + final_bonus
        )

        total_earned_points = (
            earned_step_points
            + (
                final_bonus
                if final_bonus_earned
                else 0
            )
        )

        return {
            "possible_step_points": (
                possible_step_points
            ),
            "earned_step_points": (
                earned_step_points
            ),
            "final_completion_bonus": (
                final_bonus
            ),
            "final_bonus_earned": (
                final_bonus_earned
            ),
            "total_possible_points": (
                total_possible_points
            ),
            "total_earned_points": (
                total_earned_points
            ),
        }

    # ========================================================
    # GET HISTORY
    # ========================================================

    async def get_history(
        self,
        user_id: UUID,
        *,
        category=None,
        status: WasteAnalysisStatus | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ):

        if page < 1:
            raise ValueError(
                "Page must be greater than or equal to 1."
            )

        if page_size < 1 or page_size > 100:
            raise ValueError(
                "Page size must be between 1 and 100."
            )

        if (
            start_date is not None
            and end_date is not None
            and start_date > end_date
        ):
            raise ValueError(
                "Start date cannot be after end date."
            )

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

        except ValueError:
            raise

        except Exception as exc:
            await self.session.rollback()

            raise WasteServiceError(
                f"Failed to fetch waste history: {exc}"
            ) from exc

    # ========================================================
    # GET RECENT ANALYSES
    # ========================================================

    async def get_recent_analyses(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[WasteAnalysis]:

        if limit < 1 or limit > 50:
            raise ValueError(
                "Limit must be between 1 and 50."
            )

        try:
            return (
                await self.waste_repository.get_recent_analyses(
                    user_id=user_id,
                    limit=limit,
                )
            )

        except ValueError:
            raise

        except Exception as exc:
            await self.session.rollback()

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
            deleted = (
                await self.waste_repository.delete_analysis(
                    analysis_id=analysis_id,
                    user_id=user_id,
                )
            )

            if not deleted:
                raise WasteServiceError(
                    "Waste analysis not found."
                )

            await self.session.commit()

        except WasteServiceError:
            await self.session.rollback()
            raise

        except Exception as exc:
            await self.session.rollback()

            raise WasteServiceError(
                f"Failed to delete waste analysis: {exc}"
            ) from exc