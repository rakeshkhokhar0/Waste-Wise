from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from server.app.core.dependencies import get_current_user
from server.app.database.database import get_db
from server.app.modules.rewards.repository import RewardRepository
from server.app.modules.rewards.schemas import (
    AnalysisRewardResponse,
    RewardHistoryResponse,
    RewardLeaderboardResponse,
    RewardStatsResponse,
    RewardSummaryResponse,
)
from server.app.modules.rewards.service import (
    RewardService,
    RewardServiceError,
)
from server.app.modules.user.models.user_model import User


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
    reward_repository = RewardRepository(
        session=session,
    )

    return RewardService(
        session=session,
        reward_repository=reward_repository,
    )


# ============================================================
# GET MY REWARD SUMMARY
# ============================================================


@router.get(
    "/me",
    response_model=RewardSummaryResponse,
)
async def get_my_rewards(
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    try:
        return await reward_service.get_reward_summary(
            user_id=current_user.id,
        )

    except RewardServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# ============================================================
# GET MY REWARD TRANSACTIONS
# ============================================================


@router.get(
    "/transactions",
    response_model=RewardHistoryResponse,
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
    try:
        transactions, total = (
            await reward_service.get_reward_history(
                user_id=current_user.id,
                page=page,
                page_size=page_size,
            )
        )

        return RewardHistoryResponse(
            items=transactions,
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

    except RewardServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# ============================================================
# GET MY TOTAL POINTS
# ============================================================


@router.get("/points")
async def get_my_points(
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    try:
        points = await reward_service.get_total_points(
            user_id=current_user.id,
        )

        return {
            "user_id": current_user.id,
            "total_points": points,
        }

    except RewardServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# ============================================================
# GET MY REWARD STATISTICS
# ============================================================


@router.get(
    "/stats",
    response_model=RewardStatsResponse,
)
async def get_my_reward_stats(
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    try:
        return await reward_service.get_reward_stats(
            user_id=current_user.id,
        )

    except RewardServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# ============================================================
# GET REWARDS FOR ONE ANALYSIS
# ============================================================


@router.get(
    "/analysis/{analysis_id}",
    response_model=AnalysisRewardResponse,
)
async def get_analysis_rewards(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    """
    Get the complete reward breakdown for one waste analysis.

    Returns:
        - Analysis reward
        - Step completion points
        - Category completion bonus
        - Analysis completion bonus
        - Total points earned
        - Reward transactions
    """

    try:
        return await reward_service.get_analysis_rewards(
            user_id=current_user.id,
            analysis_id=analysis_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except RewardServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# ============================================================
# GET LEADERBOARD
# ============================================================


@router.get(
    "/leaderboard",
    response_model=RewardLeaderboardResponse,
)
async def get_leaderboard(
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    reward_service: RewardService = Depends(get_reward_service),
):
    try:
        leaderboard = await reward_service.get_leaderboard(
            limit=limit,
        )

        return {
            "items": leaderboard,
            "total": len(leaderboard),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except RewardServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# ============================================================
# GET MY LEADERBOARD RANK
# ============================================================


@router.get("/rank")
async def get_my_rank(
    current_user: User = Depends(get_current_user),
    reward_service: RewardService = Depends(get_reward_service),
):
    try:
        rank_data = await reward_service.get_user_rank(
            user_id=current_user.id,
        )

        if rank_data is None:
            return {
                "user_id": current_user.id,
                "rank": None,
                "total_points": 0,
            }

        return rank_data

    except RewardServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc