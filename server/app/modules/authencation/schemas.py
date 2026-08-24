# Authentication request and response schemas.
import re
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class TokenPayload(BaseModel):
    sub : str 
    type: str
    iat : int
    exp : int
    jti : str
    

class RegisterRequest(BaseModel):
    email : EmailStr
    username : str = Field(
        ..., 
        min_length=5, 
        max_length=32, 
        pattern=r"^[a-zA-Z0-9_.]+$",
        description="Only alphanumeric characters, underscores, and dots are allowed."
    )
    password : str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password must be at least 8 characters long."
    )
    confirm_password : str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password must be at least 8 characters long."
    )
    @model_validator(mode='after')
    def password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password did not match")

        return self
        
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """
        Enforces strong password policies:
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        - At least one special character
        """
        if not re.search(r'[A-Z]', value):
            raise ValueError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'[a-z]', value):
            raise ValueError("Password must contain at least one lowercase letter.")
        
        if not re.search(r'[0-9]', value):
            raise ValueError("Password must contain at least one number.")
        
        if not re.search(r'[\W_]', value): # \W matches any non-word character
            raise ValueError("Password must contain at least one special character.")
        
        # Avoid spaces in passwords as they often lead to user confusion during login
        if " " in value:
            raise ValueError("Password cannot contain spaces.")
            
        return value

class ResendEmailVerificationRequest(BaseModel):
    identifier: EmailStr|str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Email address or username"
    )

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Enter your email or username")
    password : str = Field(...)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshRequest(BaseModel):
    refresh_token : str = Field(...)

class ForgotPasswordRequest(BaseModel):
    identifier : str = Field(...)

class ResetPasswordRequest(BaseModel):
    reset_token : str = Field(...)
    password : str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password must be at least 8 characters long."
    )
    confirm_password : str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password must be at least 8 characters long."
    )
    @model_validator(mode='after')
    def password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password did not match")

        return self
        
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """
        Enforces strong password policies:
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        - At least one special character
        """
        if not re.search(r'[A-Z]', value):
            raise ValueError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'[a-z]', value):
            raise ValueError("Password must contain at least one lowercase letter.")
        
        if not re.search(r'[0-9]', value):
            raise ValueError("Password must contain at least one number.")
        
        if not re.search(r'[\W_]', value): # \W matches any non-word character
            raise ValueError("Password must contain at least one special character.")
        
        # Avoid spaces in passwords as they often lead to user confusion during login
        if " " in value:
            raise ValueError("Password cannot contain spaces.")
            
        return value

class ChangePasswordRequest(BaseModel):
    old_password : str = Field(...)
    password : str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password must be at least 8 characters long."
    )
    confirm_password : str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password must be at least 8 characters long."
    )
    @model_validator(mode='after')
    def password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password did not match")

        return self
        
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """
        Enforces strong password policies:
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        - At least one special character
        """
        if not re.search(r'[A-Z]', value):
            raise ValueError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'[a-z]', value):
            raise ValueError("Password must contain at least one lowercase letter.")
        
        if not re.search(r'[0-9]', value):
            raise ValueError("Password must contain at least one number.")
        
        if not re.search(r'[\W_]', value): # \W matches any non-word character
            raise ValueError("Password must contain at least one special character.")
        
        # Avoid spaces in passwords as they often lead to user confusion during login
        if " " in value:
            raise ValueError("Password cannot contain spaces.")
            
        return value

class VerifyEmailRequest(BaseModel):
    token : str = Field(...)

class MessageResponse(BaseModel):
    message : str
