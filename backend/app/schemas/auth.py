import uuid

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    display_name: str
    invite_code: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    display_name: str
    is_admin: bool

    model_config = {"from_attributes": True}
