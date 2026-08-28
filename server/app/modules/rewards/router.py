# Rewards API routes for WasteWise.
# server/app/modules/rewards/router.py

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.core.dependencies import get_current_user
from server.app.database.database import get_db
from server.app.modules.user.models.user_model import User
from server.app.modules.waste.repository import WasteRepository
from server.app.modules.rewards.service import RewardService


router = APIRouter(
    prefix="/rewards",
    tags=["Rewards"],
)


# ============================================================
# DEPENDENCY
# ============================================================


def get_reward_service(
    session: AsyncSession = Depends(get_db),
) -> RewardService:

    repository = WasteRepository(
        session=session,
    )

    return RewardService(
        session=session,
        reward_repository=repository,
    )


# ============================================================
# GET MY REWARD SUMMARY
# ============================================================


@router.get(
    "/me",
)
async def get_my_rewards(
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    """
    Get the current user's reward summary.

    Returns:
        - total points
        - number of transactions
        - recent reward transactions
    """

    try:
        return await reward_service.get_reward_summary(
            user_id=current_user.id,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reward summary.",
        ) from exc


# ============================================================
# GET MY REWARD TRANSACTIONS
# ============================================================


@router.get(
    "/transactions",
)
async def get_my_reward_transactions(
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
    reward_service: RewardService = Depends(get_reward_service),
):
    """
    Get the current user's reward transaction history.
    """

    try:
        transactions, total = await reward_service.get_reward_transactions(
            user_id=current_user.id,
            page=page,
            page_size=page_size,
        )

        return {
            "items": transactions,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_next": (page * page_size) < total,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reward transactions.",
        ) from exc


# ============================================================
# GET MY TOTAL POINTS
# ============================================================


@router.get(
    "/points",
)
async def get_my_points(
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    """
    Get the current user's total reward points.
    """

    try:
        points = await reward_service.get_total_points(
            user_id=current_user.id,
        )

        return {
            "user_id": current_user.id,
            "total_points": points,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reward points.",
        ) from exc


# ============================================================
# GET REWARDS FOR ONE WASTE ANALYSIS
# ============================================================


@router.get(
    "/analysis/{analysis_id}",
)
async def get_analysis_rewards(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    """
    Get rewards earned from one waste analysis.
    """

    try:
        return await reward_service.get_analysis_rewards(
            user_id=current_user.id,
            analysis_id=analysis_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analysis rewards.",
        ) from exc