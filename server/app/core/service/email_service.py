from email.message import EmailMessage

import aiosmtplib

from server.app.core.config import emailsetting

class EmailService:

    @staticmethod
    async def send_mail(
        to_email:str,
        subject :str,
        body : str,
        html_body : str | None = None,
    )->None:
        message = EmailMessage()

        message["from"] = emailsetting.SMTP_EMAIL
        message["to"] = to_email
        message["subject"] = subject
        message.set_content(body)
        if html_body:
            message.add_alternative(html_body, subtype="html")

        await aiosmtplib.send(
            message,
            hostname=emailsetting.SMTP_HOST,
            port=emailsetting.SMTP_PORT,
            start_tls=True,
            username=emailsetting.SMTP_EMAIL,
            password=emailsetting.SMTP_PASSWORD,
        )

    @staticmethod
    async def send_verification_email(
        email:str,
        verification_url:str
    ):
        body = f"""
            Hello user,

            Please verify your email by visiting

            {verification_url}

            If you do not create this account,
            please ignore this email
        """
        html_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#14213d">
            <!-- CHANGE: use the application's social-media identity in customer email. -->
            <h2 style="margin:0 0 16px">Verify your email</h2>
            <p>Thanks for creating your account. Confirm your email address to activate it.</p>
            <p style="margin:28px 0">
                <a href="{verification_url}" style="display:inline-block;background:#2357d5;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Verify email</a>
            </p>
            <p style="font-size:13px;color:#667085">If you did not create this account, you can safely ignore this email.</p>
        </div>
        """
        await EmailService.send_mail(
            to_email=email,
            subject="verify your email",
            body=body,
            html_body=html_body,
        )

    @staticmethod
    async def reset_password_email(
        email:str,
        reset_url:str,
    ):
        body = f"""
            Hello user,

            You requested a password reset.
            
            Reset your password here:

            {reset_url}

            If you did not request this,
            please ignore this email
        """

        html_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#14213d">
            <!-- CHANGE: use the application's social-media identity in customer email. -->
            <h2 style="margin:0 0 16px">Reset your password</h2>
            <p>You requested a password reset. Click the button below to choose a new password.</p>
            <p style="margin:28px 0">
                <a href="{reset_url}" style="display:inline-block;background:#2357d5;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Reset password</a>
            </p>
            <p style="font-size:13px;color:#667085">If you did not request this, you can safely ignore this email.</p>
        </div>
        """
        await EmailService.send_mail(
            to_email=email,
            subject="Reset your password",
            body=body,
            html_body=html_body
        )

