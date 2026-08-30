# app/modules/waste/services/waste_service.py

from datetime import date
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.modules.rewards.service import RewardService
from server.app.modules.waste.models import (
    WasteAnalysis,
    WasteAnalysisStatus,
)
from server.app.modules.waste.repository import WasteRepository
from server.app.modules.waste.schemas import (
    AIWasteAnalysis,
)
from server.app.modules.waste.services.ai_service import AIService
from server.app.modules.waste.services.disposal_services import DisposalService
from server.app.modules.waste.services.image_services import (
    ImageService,
)


class WasteServiceError(Exception):
    """
    Base exception for WasteService.
    """

    pass


class WasteAnalysisError(WasteServiceError):
    """
    Raised when waste image analysis fails.
    """

    pass


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
        - Update disposal-step completion
        - Calculate analysis progress
        - Fetch waste history
        - Delete waste analysis
        - Award reward points for the actions above

    The service owns the transaction for complete workflows.
    RewardService.award_*() methods never commit on their own
    (see rewards/service.py docstrings) — they're called here,
    inside the same transaction as the waste-module writes they
    accompany, and the transaction is committed once at the end.
    """

    def __init__(
        self,
        session: AsyncSession,
        waste_repository: WasteRepository,
        image_service: ImageService,
        ai_service: AIService,
        disposal_service: DisposalService,
        reward_service: RewardService,
    ):
        self.session = session
        self.waste_repository = waste_repository
        self.image_service = image_service
        self.ai_service = ai_service
        self.disposal_service = disposal_service
        self.reward_service = reward_service

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
            AI analysis - ONE API CALL
                ↓
            Create WasteAnalysis
                ↓
            Create category results
                ↓
            Create disposal steps
                ↓
            Award analysis reward
                ↓
            Commit transaction

        If any database operation fails, the entire database
        transaction is rolled back.

        Note:
            Cloudinary is external to the database transaction.
            For the MVP, uploaded images are not deleted if a
            later operation fails.
        """

        try:
            # ------------------------------------------------
            # 1. Upload image to Cloudinary
            # ------------------------------------------------

            uploaded_image = (
                await self.image_service.upload_image(
                    file=image,
                )
            )

            # ------------------------------------------------
            # 2. Analyze image using AI
            #
            # ONE AI CALL returns:
            #   - summary
            #   - categories
            #   - items
            #   - confidence
            #   - disposal_steps
            # ------------------------------------------------

            ai_result = (
                await self.ai_service.analyze_image(
                    image_url=uploaded_image.url,
                )
            )

            # ------------------------------------------------
            # 3. Validate AI result
            # ------------------------------------------------

            self._validate_ai_result(ai_result)

            # ------------------------------------------------
            # 4. Create main waste analysis
            # ------------------------------------------------

            analysis = (
                await self.waste_repository.create_analysis(
                    user_id=user_id,
                    image_url=uploaded_image.url,
                    status=WasteAnalysisStatus.IN_PROGRESS,
                )
            )

            # ------------------------------------------------
            # 5. Create categories and disposal steps
            # ------------------------------------------------

            for category in ai_result.categories:

                # --------------------------------------------
                # Create category result
                # --------------------------------------------

                category_result = (
                    await self.waste_repository.create_category_result(
                        waste_analysis_id=analysis.id,
                        category=category.category,
                        items=category.items,
                        confidence=category.confidence,
                    )
                )

                # --------------------------------------------
                # Create AI-generated disposal steps
                # --------------------------------------------

                await self.disposal_service.create_steps_from_ai(
                    category_result_id=category_result.id,
                    disposal_steps=category.disposal_steps,
                )

            # ------------------------------------------------
            # 6. Award reward points for a successful analysis
            #
            # Idempotent — RewardService checks for an existing
            # transaction for this analysis_id before awarding,
            # so this is safe even if analyze_waste is somehow
            # retried against the same analysis.
            # ------------------------------------------------

            await self.reward_service.award_analysis_reward(
                user_id=user_id,
                analysis_id=analysis.id,
            )

            # ------------------------------------------------
            # 7. Commit complete transaction
            # ------------------------------------------------

            await self.session.commit()

            # ------------------------------------------------
            # 8. Return analysis
            # ------------------------------------------------

            return analysis

        except Exception as exc:
            # ------------------------------------------------
            # Rollback all database operations
            # ------------------------------------------------

            await self.session.rollback()

            # Keep application-specific errors intact
            if isinstance(exc, WasteServiceError):
                raise

            raise WasteAnalysisError(
                "Failed to analyze waste image."
            ) from exc

    # ========================================================
    # VALIDATE AI RESULT
    # ========================================================

    def _validate_ai_result(
        self,
        ai_result: AIWasteAnalysis,
    ) -> None:
        """
        Perform service-level validation of the AI result.

        Pydantic already handles schema validation. This method
        handles validation related to our application workflow.
        """

        # ----------------------------------------------------
        # Make sure categories exist
        # ----------------------------------------------------

        if not ai_result.categories:
            raise WasteAnalysisError(
                "No waste categories were detected in the image."
            )

        # ----------------------------------------------------
        # Make sure every category contains items
        # ----------------------------------------------------

        for category in ai_result.categories:

            if not category.items:
                raise WasteAnalysisError(
                    "AI returned a waste category without items."
                )

            # ------------------------------------------------
            # Make sure every category has disposal steps
            # ------------------------------------------------

            if not category.disposal_steps:
                raise WasteAnalysisError(
                    "AI returned a waste category without "
                    "disposal steps."
                )

    # ========================================================
    # GET COMPLETE ANALYSIS
    # ========================================================

    async def get_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> WasteAnalysis:
        """
        Get one complete waste analysis.

        The repository loads:

            WasteAnalysis
                ↓
            Category Results
                ↓
            Disposal Steps
        """

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

        except Exception:
            await self.session.rollback()
            raise

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
        """
        Update a disposal step and return the updated analysis.

        Flow:

            Validate ownership
                ↓
            Update step
                ↓
            Award step / category / analysis completion rewards
                ↓
            Fetch all analysis steps
                ↓
            Calculate progress
                ↓
            If all steps completed:
                analysis = COMPLETED
                ↓
            Commit
        """

        try:
            # ------------------------------------------------
            # 1. Get and validate step ownership
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
            # 2. Update step completion
            #
            # IMPORTANT:
            # We directly use repository here instead of
            # DisposalService.update_step_completion() because
            # that method commits standalone operations.
            # This operation is part of a larger transaction.
            # ------------------------------------------------

            await self.waste_repository.update_step_completion(
                step=step,
                is_completed=is_completed,
            )

            # ------------------------------------------------
            # 3. Award reward points
            #
            # Only on the transition to completed — unchecking a
            # step never awards (and RewardService.award_step_
            # reward() itself refuses to award an incomplete
            # step). Category/analysis completion bonuses are
            # each idempotent and cheap to re-check every time,
            # so it's safe to call them on every completion.
            # ------------------------------------------------

            if is_completed:
                await self.reward_service.award_step_reward(
                    user_id=user_id,
                    step_id=step_id,
                )

                await self.reward_service.award_category_completion_bonus(
                    user_id=user_id,
                    category_id=category_result_id,
                )

                await self.reward_service.award_analysis_completion_bonus(
                    user_id=user_id,
                    analysis_id=analysis_id,
                )

            # ------------------------------------------------
            # 4. Get complete analysis
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
            # 5. Collect all disposal steps
            # ------------------------------------------------

            all_steps = []

            for category_result in analysis.category_results:
                all_steps.extend(
                    category_result.disposal_steps
                )

            # ------------------------------------------------
            # 6. Calculate overall progress
            # ------------------------------------------------

            (
                total_steps,
                completed_steps,
                progress_percentage,
            ) = self.disposal_service.calculate_progress(
                steps=all_steps,
            )

            # ------------------------------------------------
            # 7. Update analysis status
            # ------------------------------------------------

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

            # ------------------------------------------------
            # 8. Update timestamp
            #
            # We use the repository's update method for
            # timestamp management. The model's updated_at
            # can also be handled by SQLAlchemy on update,
            # depending on your model configuration.
            # ------------------------------------------------

            # Flush the status change before commit.
            await self.session.flush()

            # ------------------------------------------------
            # 9. Commit entire operation
            # ------------------------------------------------

            await self.session.commit()

            return analysis

        except WasteServiceError:
            await self.session.rollback()
            raise

        except Exception as exc:
            await self.session.rollback()

            raise WasteServiceError(
                "Failed to update disposal step."
            ) from exc

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
        """
        Get paginated waste-analysis history.

        Supported filters:

            - category
            - status
            - start_date
            - end_date
            - page
            - page_size

        Example:

            get_history(
                user_id=user_id,
                category=WasteCategory.RECYCLABLE,
            )
        """

        try:
            # ------------------------------------------------
            # Validate pagination
            # ------------------------------------------------

            if page < 1:
                raise ValueError(
                    "Page must be greater than or equal to 1."
                )

            if page_size < 1 or page_size > 100:
                raise ValueError(
                    "Page size must be between 1 and 100."
                )

            # ------------------------------------------------
            # Validate date range
            # ------------------------------------------------

            if (
                start_date is not None
                and end_date is not None
                and start_date > end_date
            ):
                raise ValueError(
                    "Start date cannot be after end date."
                )

            # ------------------------------------------------
            # Get history from repository
            # ------------------------------------------------

            analyses, total = (
                await self.waste_repository.get_history(
                    user_id=user_id,
                    category=category,
                    status=status,
                    start_date=start_date,
                    end_date=end_date,
                    page=page,
                    page_size=page_size,
                )
            )

            return analyses, total

        except ValueError:
            raise

        except Exception:
            await self.session.rollback()
            raise

    # ========================================================
    # GET RECENT ANALYSES
    # ========================================================

    async def get_recent_analyses(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[WasteAnalysis]:
        """
        Get the user's most recent waste analyses.
        """

        try:
            if limit < 1 or limit > 50:
                raise ValueError(
                    "Limit must be between 1 and 50."
                )

            return (
                await self.waste_repository.get_recent_analyses(
                    user_id=user_id,
                    limit=limit,
                )
            )

        except ValueError:
            raise

        except Exception:
            await self.session.rollback()
            raise

    # ========================================================
    # DELETE ANALYSIS
    # ========================================================

    async def delete_analysis(
        self,
        analysis_id: UUID,
        user_id: UUID,
    ) -> None:
        """
        Permanently delete a waste analysis.

        Related category results and disposal steps are
        removed through configured SQLAlchemy cascade
        relationships.

        NOTE:
            The Cloudinary image is NOT deleted in the MVP.
        """

        try:
            # ------------------------------------------------
            # Delete analysis
            # ------------------------------------------------

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

            # ------------------------------------------------
            # Commit
            # ------------------------------------------------

            await self.session.commit()

        except WasteServiceError:
            await self.session.rollback()
            raise

        except Exception as exc:
            await self.session.rollback()

            raise WasteServiceError(
                "Failed to delete waste analysis."
            ) from exc