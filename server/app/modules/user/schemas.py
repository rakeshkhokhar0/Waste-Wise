# Users request and response schemas.
from pydantic import BaseModel,EmailStr,ConfigDict
from uuid import UUID

class UserResponse(BaseModel):
    id : UUID
    user_name : str
    email : EmailStr
    is_verified : bool 
    is_active : bool

    model_config = ConfigDict(from_attributes=True)

class DeleteAccount(BaseModel):
    password : str