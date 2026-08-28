# server/app/modules/waste/router.py

from datetime import date
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.core.dependencies import get_current_user
from server.app.database.database import get_db
from server.app.modules.user.models.user_model import User
from server.app.modules.waste.models import (
    WasteAnalysis,
    WasteAnalysisStatus,
    WasteCategory,
)
from server.app.modules.waste.repository import WasteRepository
from server.app.modules.waste.schemas import (
    DisposalStepResponse,
    DisposalStepUpdate,
    WasteAnalysisHistoryResponse,
    WasteAnalysisListResponse,
    WasteAnalysisResponse,
)
from server.app.modules.waste.services.ai_service import AIService
from server.app.modules.waste.services.disposal_services import (
    DisposalService,
)
from server.app.modules.waste.services.image_services import (
    ImageService,
)
from server.app.modules.waste.services.waste_service import (
    WasteService,
    WasteServiceError,
)


router = APIRouter(
    prefix="/waste",
    tags=["Waste"],
)


# ============================================================
# DEPENDENCY
# ============================================================


def get_waste_service(
    session: AsyncSession = Depends(get_db),
) -> WasteService:
    """
    Build WasteService with all required Waste dependencies.

    Rewards are intentionally NOT injected here.
    Reward operations belong to the Rewards module.
    """

    waste_repository = WasteRepository(
        session=session,
    )

    image_service = ImageService()

    ai_service = AIService()

    disposal_service = DisposalService(
        session=session,
        waste_repository=waste_repository,
    )

    return WasteService(
        session=session,
        waste_repository=waste_repository,
        image_service=image_service,
        ai_service=ai_service,
        disposal_service=disposal_service,
    )


# ============================================================
# 1. ANALYZE WASTE IMAGE
# ============================================================


@router.post(
    "/analyze",
    response_model=WasteAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_waste(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    waste_service: WasteService = Depends(get_waste_service),
):
    """
    Upload and analyze a waste image.
    """

    try:
        analysis = await waste_service.analyze_waste(
            user_id=current_user.id,
            image=image,
        )

        complete_analysis = await waste_service.get_analysis(
            analysis_id=analysis.id,
            user_id=current_user.id,
        )

        return _build_analysis_response(
            complete_analysis,
            waste_service,
        )

    except WasteServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze waste image.",
        ) from exc


# ============================================================
# 2. WASTE HISTORY
# ============================================================

# IMPORTANT:
# These routes must come BEFORE /{analysis_id}.
# Otherwise "history" can be interpreted as analysis_id.


@router.get(
    "/history",
    response_model=WasteAnalysisHistoryResponse,
)
async def get_waste_history(
    category: WasteCategory | None = Query(
        default=None,
    ),
    status_filter: WasteAnalysisStatus | None = Query(
        default=None,
        alias="status",
    ),
    start_date: date | None = Query(
        default=None,
    ),
    end_date: date | None = Query(
        default=None,
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    current_user: User = Depends(get_current_user),
    waste_service: WasteService = Depends(get_waste_service),
):
    """
    Get paginated waste analysis history.
    """

    try:
        analyses, total = await waste_service.get_history(
            user_id=current_user.id,
            category=category,
            status=status_filter,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size,
        )

        items = [
            _build_history_item(
                analysis,
                waste_service,
            )
            for analysis in analyses
        ]

        return WasteAnalysisHistoryResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except WasteServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch waste history.",
        ) from exc


# ============================================================
# 3. RECENT ANALYSES
# ============================================================


@router.get(
    "/recent",
    response_model=list[WasteAnalysisListResponse],
)
async def get_recent_analyses(
    limit: int = Query(
        default=5,
        ge=1,
        le=50,
    ),
    current_user: User = Depends(get_current_user),
    waste_service: WasteService = Depends(get_waste_service),
):
    """
    Get the user's most recent waste analyses.
    """

    try:
        analyses = await waste_service.get_recent_analyses(
            user_id=current_user.id,
            limit=limit,
        )

        return [
            _build_history_item(
                analysis,
                waste_service,
            )
            for analysis in analyses
        ]

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except WasteServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recent analyses.",
        ) from exc


# ============================================================
# 4. GET COMPLETE ANALYSIS
# ============================================================


@router.get(
    "/{analysis_id}",
    response_model=WasteAnalysisResponse,
)
async def get_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    waste_service: WasteService = Depends(get_waste_service),
):
    """
    Get one complete waste analysis.
    """

    try:
        analysis = await waste_service.get_analysis(
            analysis_id=analysis_id,
            user_id=current_user.id,
        )

        return _build_analysis_response(
            analysis,
            waste_service,
        )

    except WasteServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch waste analysis.",
        ) from exc


# ============================================================
# 5. GET CATEGORY-WISE DISPOSAL STEPS
# ============================================================


@router.get(
    "/{analysis_id}/categories/{category_id}/steps",
    response_model=list[DisposalStepResponse],
)
async def get_category_disposal_steps(
    analysis_id: UUID,
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    waste_service: WasteService = Depends(get_waste_service),
):
    """
    Get all disposal steps for one waste category.
    """

    try:
        category = (
            await waste_service.waste_repository.get_category_by_id(
                category_id=category_id,
                analysis_id=analysis_id,
                user_id=current_user.id,
            )
        )

        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Waste category not found.",
            )

        steps = await waste_service.disposal_service.get_steps(
            category_result_id=category_id,
        )

        return steps

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch disposal steps.",
        ) from exc


# ============================================================
# 6. COMPLETE / UNCOMPLETE DISPOSAL STEP
# ============================================================


@router.patch(
    "/{analysis_id}/categories/{category_id}/steps/{step_id}",
    response_model=WasteAnalysisResponse,
)
async def update_disposal_step(
    analysis_id: UUID,
    category_id: UUID,
    step_id: UUID,
    request: DisposalStepUpdate,
    current_user: User = Depends(get_current_user),
    waste_service: WasteService = Depends(get_waste_service),
):
    """
    Mark a disposal step as completed or incomplete.

    This route only handles Waste functionality.
    Reward awarding is handled separately by the Rewards module.
    """

    try:
        analysis = await waste_service.update_disposal_step(
            step_id=step_id,
            category_result_id=category_id,
            analysis_id=analysis_id,
            user_id=current_user.id,
            is_completed=request.is_completed,
        )

        complete_analysis = await waste_service.get_analysis(
            analysis_id=analysis.id,
            user_id=current_user.id,
        )

        return _build_analysis_response(
            complete_analysis,
            waste_service,
        )

    except WasteServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update disposal step.",
        ) from exc


# ============================================================
# 7. DELETE ANALYSIS
# ============================================================


@router.delete(
    "/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    waste_service: WasteService = Depends(get_waste_service),
):
    """
    Delete a waste analysis.
    """

    try:
        await waste_service.delete_analysis(
            analysis_id=analysis_id,
            user_id=current_user.id,
        )

    except WasteServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete waste analysis.",
        ) from exc


# ============================================================
# RESPONSE HELPERS
# ============================================================


def _build_analysis_response(
    analysis: WasteAnalysis,
    waste_service: WasteService,
) -> WasteAnalysisResponse:
    """
    Convert SQLAlchemy WasteAnalysis into the frontend
    response and calculate disposal progress.
    """

    category_responses = []
    all_steps = []

    for category_result in analysis.category_results:

        category_steps = list(
            category_result.disposal_steps
        )

        all_steps.extend(category_steps)

        (
            total_steps,
            completed_steps,
            progress_percentage,
        ) = waste_service.disposal_service.calculate_progress(
            steps=category_steps,
        )

        category_responses.append(
            {
                "id": category_result.id,
                "category": category_result.category,
                "items": category_result.items,
                "confidence": category_result.confidence,
                "disposal_steps": category_steps,
                "total_steps": total_steps,
                "completed_steps": completed_steps,
                "progress_percentage": progress_percentage,
            }
        )

    (
        total_steps,
        completed_steps,
        progress_percentage,
    ) = waste_service.disposal_service.calculate_progress(
        steps=all_steps,
    )

    return WasteAnalysisResponse(
        id=analysis.id,
        image_url=analysis.image_url,
        status=analysis.status,
        ai_summary=analysis.ai_summary,
        categories=category_responses,
        total_steps=total_steps,
        completed_steps=completed_steps,
        progress_percentage=progress_percentage,
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
    )


def _build_history_item(
    analysis: WasteAnalysis,
    waste_service: WasteService,
) -> WasteAnalysisListResponse:
    """
    Build the lightweight waste history response.
    """

    categories = []
    all_steps = []

    for category_result in analysis.category_results:

        categories.append(
            {
                "category": category_result.category,
            }
        )

        all_steps.extend(
            category_result.disposal_steps
        )

    (
        total_steps,
        completed_steps,
        progress_percentage,
    ) = waste_service.disposal_service.calculate_progress(
        steps=all_steps,
    )

    return WasteAnalysisListResponse(
        id=analysis.id,
        image_url=analysis.image_url,
        status=analysis.status,
        categories=categories,
        total_steps=total_steps,
        completed_steps=completed_steps,
        progress_percentage=progress_percentage,
        created_at=analysis.created_at,
    )