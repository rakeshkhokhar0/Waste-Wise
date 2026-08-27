# Authentication API routes for WasteWise.
from fastapi import APIRouter,Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.authencation.repository.refresh_token import RefreshTokenReopsitory
from app.modules.authencation.repository.email_verification import EmailVerificationReopsitory
from app.modules.authencation.repository.reset_password import ResetPasswordReopsitory
from app.modules.user.repository.user_repo import UserRepository

from app.database.database import get_db

from app.modules.authencation.services.auth_services import AuthServices

from app.modules.authencation.schemas import MessageResponse,RegisterRequest,TokenResponse,LoginRequest,TokenRefreshRequest,ForgotPasswordRequest,ResetPasswordRequest,ChangePasswordRequest,ResendEmailVerificationRequest

from app.core.dependencies import get_current_user
from app.modules.user.models.user_model import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication",],
)

def get_auth_services(
    session  : AsyncSession  = Depends(get_db)
)->AuthServices:
    return AuthServices(
        session=session,
        userrepo=UserRepository(session=session),
        emailrepo=EmailVerificationReopsitory(session=session),
        resetrepo=ResetPasswordReopsitory(session=session),
        refereshrepo=RefreshTokenReopsitory(session=session),
    )


@router.post("/register",response_model=MessageResponse)
async def register(
    request : RegisterRequest,
    service : AuthServices = Depends(get_auth_services),
):
    return await service.create(request)

@router.post("/resend-verification-email",response_model=MessageResponse)
async def resend_verification_emial(
    request : ResendEmailVerificationRequest,
    service : AuthServices = Depends(get_auth_services)
):
    return await service.resend_email_verification(request=request)

@router.post("/login",response_model=TokenResponse)
async def login(
    request : LoginRequest,
    service : AuthServices = Depends(get_auth_services)
):
    return await service.login(request)

@router.post("/verify-email",response_model=MessageResponse)
async def verify_email(
    token : str,
    service : AuthServices = Depends(get_auth_services)
):
    return await service.verify_email(token=token)

@router.post("/refresh-token",response_model=TokenResponse)
async def refresh_token(
    request : TokenRefreshRequest,
    service : AuthServices = Depends(get_auth_services)
):
    return await service.token_refresh(request=request)

@router.post(
    "/logout",
    response_model=MessageResponse,
)
async def logout(
    request: TokenRefreshRequest,
    service : AuthServices = Depends(get_auth_services),
):
    return await service.logout(request)

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
)
async def forgot_password(
    request: ForgotPasswordRequest,
    service: AuthServices = Depends(get_auth_services),
):
    return await service.forgot_password(request)

@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
async def reset_password(
    request: ResetPasswordRequest,
    service: AuthServices = Depends(get_auth_services),
):
    return await service.reset_password(request)

@router.post(
    "/change-password",
    response_model=MessageResponse,
)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    service: AuthServices = Depends(get_auth_services),
):
    return await service.change_password(
        user_id=current_user.id,
        request=request,
    )
