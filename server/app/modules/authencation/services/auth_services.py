from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from server.app.core.config import emailsetting, resetpassword
from server.app.core.security.jwt_service import JWTService
from server.app.core.security.password_service import PasswordService
from server.app.core.security.token_service import TokenService
from server.app.core.service.email_service import EmailService
from server.app.modules.authencation.models.email_verification import EmailVerification
from server.app.modules.authencation.models.refresh_token import RefreshToken
from server.app.modules.authencation.models.reset_password import ResetPassword
from server.app.modules.authencation.repository.email_verification import (
    EmailVerificationReopsitory,
)
from server.app.modules.authencation.repository.refresh_token import (
    RefreshTokenReopsitory,
)
from server.app.modules.authencation.repository.reset_password import (
    ResetPasswordReopsitory,
)
from server.app.modules.authencation.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendEmailVerificationRequest,
    ResetPasswordRequest,
    TokenRefreshRequest,
    TokenResponse,
)
from server.app.modules.user.models.user_model import User
from server.app.modules.user.repository.user_repo import UserRepository
from server.app.modules.user.services.account_service import AccountService


class AuthServices:
    def __init__(
        self,
        session:AsyncSession,
        userrepo:UserRepository,
        emailrepo:EmailVerificationReopsitory,
        resetrepo:ResetPasswordReopsitory,
        refereshrepo:RefreshTokenReopsitory
    ):
        self.session = session
        self.user_repository = userrepo
        self.email_verification_repository = emailrepo
        self.reset_password_repository = resetrepo
        self.refresh_token_repository = refereshrepo
        self.jwt_service = JWTService()
        self.password_service = PasswordService()
        self.email_service = EmailService()
        self.token_service = TokenService()
        self.account_service = AccountService(session=session)

    async def create(
        self,
        request:RegisterRequest
    )->MessageResponse:
        try:
            existing_user_email = await self.user_repository.get_user_by_identifier(request.email.lower())
            existing_user_username = await self.user_repository.get_user_by_identifier(request.username)


            await self.account_service.validate_registration_user(
                existing_user_email,
                "Email already registered",
            )

            await self.account_service.validate_registration_user(
                existing_user_username,
                "Username already taken",
            )


            hash_password = self.password_service.hash_password(password=request.password)

            user = await self.user_repository.create_user(
                User(
                    email=request.email.lower(),
                    user_name=request.username,
                    password_hash=hash_password
                )
            )

            email_verification_token = self.token_service.generate_token()
            email_verification_token_hash=self.token_service.hash_token(token=email_verification_token)
            expires_at=self.token_service.create_expire(expire_minute=emailsetting.EMAIL_VERIFICATION_EXPIRE_MINUTES)

            verification = EmailVerification(
                user_id=user.id,
                token_hash=email_verification_token_hash,
                expires_at=expires_at,
            )

            await self.email_verification_repository.create_email_verification(request=verification)

            frontend_url = (
                f"{emailsetting.FRONTEND_URL.rstrip('/')}"
                f"/auth/verify-email?token={email_verification_token}"
            )

            # CHANGE: persist the user and token before attempting SMTP delivery.
            await self.session.commit()

            await self.email_service.send_verification_email(
                email=user.email,
                verification_url=frontend_url,
            )

            return MessageResponse(
                message=(
                    "Registration successful."
                    "Please verify your email."
                )
            )

        except Exception:
            await self.session.rollback()
            raise

    async def resend_email_verification(
        self,
        request:ResendEmailVerificationRequest
    )->MessageResponse:
        try:
            user = await self.user_repository.get_user_by_identifier(request.identifier)

            if not user or not user.is_active:
                # CHANGE: avoid disclosing account state from a public endpoint.
                return MessageResponse(message="If an eligible account exists, a verification email has been sent.")

            if user.is_verified:
                raise ValueError("Email already verified.")

            email_verification_token = self.token_service.generate_token()
            email_verification_token_hash=self.token_service.hash_token(token=email_verification_token)
            expires_at=self.token_service.create_expire(expire_minute=emailsetting.EMAIL_VERIFICATION_EXPIRE_MINUTES)
            
            # CHANGE: only one unused verification link may remain active.
            await self.email_verification_repository.invalidate_active_tokens(user.id)

            verification = EmailVerification(
                user_id=user.id,
                token_hash=email_verification_token_hash,
                expires_at=expires_at,
            )
            
            await self.email_verification_repository.create_email_verification(verification)
            
            frontend_url = (
                f"{emailsetting.FRONTEND_URL.rstrip('/')}"
                f"/auth/verify-email?token={email_verification_token}"
            )

            # CHANGE: commit token state before SMTP delivery.
            await self.session.commit()
            
            await self.email_service.send_verification_email(
                email=user.email,
                verification_url=frontend_url,
            )
            
            return MessageResponse(
                message="Verification email sent successfully. Please verify your email."
            )
        except Exception:
            await self.session.rollback()
            raise

    async def verify_email(
        self,
        token:str
    )->MessageResponse:
        try:
            hashed_token = self.token_service.hash_token(token=token)

            token_record = await self.email_verification_repository.get_vaild_email_verification_token(token=hashed_token)

            if not token_record:
                raise ValueError("Invalid or Expired token")

            user = await self.user_repository.get_user_by_id(token_record.user_id)

            if user is None:
                raise ValueError("Account is no longer available.")

            await self.email_verification_repository.mark_emial_verified(request=token_record)
            await self.user_repository.mark_email_verified(user=user)
            await self.session.commit()

            return (
                MessageResponse(
                    message= "Email verified successfully"
                )
            )

        except Exception:
            await self.session.rollback()
            raise

    async def login(
        self,
        request:LoginRequest
    )->TokenResponse:
        try:

            user = await self.user_repository.get_user_by_identifier(request.identifier)

            if user is None:
                raise ValueError("Invalid email/username or password.")

            is_valid = self.password_service.verify_password(request.password,user.password_hash)

            if not is_valid:
                raise ValueError("Invalid email/username or password.")

            # CHANGE: validate credentials before revealing the account's state.
            if not user.is_active:
                raise ValueError("Account is unavailable.")

            if not user.is_verified:
                raise ValueError("Please verify your email before logging in.")
            
            # Generate access and refresh tokens for an authenticated user.
            access_token = self.jwt_service.create_access_token(user_id=user.id)
            refresh_token = self.jwt_service.create_refresh_token(user_id=user.id)

            #refresh token payload 
            refresh_payload = self.jwt_service.decode_token(refresh_token)
            refresh_token_hash = self.token_service.hash_token(token=refresh_token)

            token = RefreshToken(
                user_id = user.id,
                token_hash = refresh_token_hash,
                expires_at = datetime.fromtimestamp(
                    refresh_payload.exp,
                    tz=timezone.utc,
                ),
            )
            await self.refresh_token_repository.create_refresh_token(
                token=token
            )

            await self.user_repository.update_last_login(user=user)

            await self.session.commit()

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer"
            )

        except Exception:
            await self.session.rollback()
            raise

    async def token_refresh(
        self,
        request:TokenRefreshRequest
    )->TokenResponse:
        try:
            payload = self.jwt_service.decode_token(request.refresh_token)

            self.jwt_service.verify_token_type(payload, "refresh")

            hash_refresh_token = self.token_service.hash_token(request.refresh_token)

            token_record = await self.refresh_token_repository.get_token(token_hash=hash_refresh_token)

            if not token_record:
                raise ValueError("Invalid token")

            # CHANGE: ensure the signed token and stored token belong together.
            if str(token_record.user_id) != payload.sub:
                raise ValueError("Invalid token")

            user = await self.user_repository.get_user_by_id(token_record.user_id)
            if user is None or not user.is_active:
                raise ValueError("Account is unavailable.")

            # CHANGE: rotate refresh tokens to prevent reuse of a stolen token.
            await self.refresh_token_repository.revoke_refresh_token(token_record)

            access_token = self.jwt_service.create_access_token(user_id=user.id)
            refresh_token = self.jwt_service.create_refresh_token(user_id=user.id)
            refresh_payload = self.jwt_service.decode_token(refresh_token)
            await self.refresh_token_repository.create_refresh_token(
                RefreshToken(
                    user_id=user.id,
                    token_hash=self.token_service.hash_token(refresh_token),
                    expires_at=datetime.fromtimestamp(refresh_payload.exp, tz=timezone.utc),
                )
            )

            await self.session.commit()

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer"
            )                        


        except Exception:
            await self.session.rollback()
            raise

    async def logout(
        self,
        request:TokenRefreshRequest
    )->MessageResponse:
        try:
            payload = self.jwt_service.decode_token(token=request.refresh_token)

            self.jwt_service.verify_token_type(payload, "refresh")
            
            hash_refresh_token = self.token_service.hash_token(token=request.refresh_token)

            token_record = await self.refresh_token_repository.get_token(token_hash=hash_refresh_token)

            if not token_record:
                raise ValueError(
                    "Invalid or Expired token"
                )
            
            await self.refresh_token_repository.revoke_refresh_token(refresh_token=token_record)

            await self.session.commit()

            return MessageResponse(
                message="Logout successful"
            )

        except Exception:
            await self.session.rollback()
            raise
            
    async def forgot_password(
        self,
        request:ForgotPasswordRequest
    )->MessageResponse:
        try:
            user = await self.user_repository.get_user_by_identifier(identifier=request.identifier)

            # CHANGE: respond identically for missing/ineligible accounts.
            generic_message = "If an eligible account exists, a password reset link has been sent."
            if not user or not user.is_active:
                return MessageResponse(message=generic_message)

            password_reset_token = self.token_service.generate_token()
            hash_reset_password_token = self.token_service.hash_token(token=password_reset_token)

            expires_at = self.token_service.create_expire(expire_minute=resetpassword.PASSWORD_RESET_EXPIRE_MINUTE)

            # CHANGE: invalidate prior reset links before issuing a new one.
            await self.reset_password_repository.invalidate_active_tokens(user.id)

            token = ResetPassword(
                user_id = user.id,
                token_hash = hash_reset_password_token,
                expires_at = expires_at,
            )

            await self.reset_password_repository.create_reset_password(request=token)

            reset_url = (
                f"{emailsetting.FRONTEND_URL.rstrip('/')}"
                f"/auth/reset-password?token={password_reset_token}"
            )


            # CHANGE: persist the reset record before SMTP delivery.
            await self.session.commit()

            await self.email_service.reset_password_email(
                email=user.email,
                reset_url=reset_url
            )

            return MessageResponse(message=generic_message)
        except Exception:
            await self.session.rollback()
            raise

    async def reset_password(
        self,
        request:ResetPasswordRequest
    )->MessageResponse:
        try:
            hash_token = self.token_service.hash_token(request.reset_token)
            token_record =await self.reset_password_repository.get_reset_password(token_hash=hash_token)

            if not token_record:
                raise ValueError("Invalid or Expired token")

            user = await self.user_repository.get_user_by_id(user_id=token_record.user_id)

            if not user:
                raise ValueError("Account is unavailable.")

            if not user.is_active:
                raise ValueError("Account is unavailable.")

            hash_password = self.password_service.hash_password(password=request.password)

            await self.user_repository.update_password(user=user,password_hash=hash_password)
            await self.reset_password_repository.mark_reset_password_used(token_record)
            await self.refresh_token_repository.revoke_all_refresh_token(user.id)

            await self.session.commit()

            return MessageResponse(
                message=(
                    "Password reset successfully"
                )
            )

        except Exception:
            await self.session.rollback()
            raise

    async def change_password(
        self,
        user_id : UUID,    
        request:ChangePasswordRequest
    ):
        try:
            user = await self.user_repository.get_user_by_id(user_id=user_id)
            
            if not user:
                raise ValueError("User not found")
            
            is_valid = self.password_service.verify_password(password=request.old_password,hash_password=user.password_hash)

            if not is_valid:
                raise ValueError("Current password is incorrect")
            
            same_password = self.password_service.verify_password(password=request.password,hash_password=user.password_hash)
            if same_password:
                raise ValueError("New password must be different")
            
            hash_password = self.password_service.hash_password(password=request.password)

            await self.user_repository.update_password(
                user=user,
                password_hash=hash_password,
            )
            
            await self.refresh_token_repository.revoke_all_refresh_token(
                user_id=user_id   
            )
            await self.session.commit()

            return MessageResponse(
                message="Password change successfully"
            )
        
        except Exception:
            await self.session.rollback()
            raise
            
