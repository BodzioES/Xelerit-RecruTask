from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class ProviderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    email: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token lifetime in seconds.")
    user: ProviderRead
