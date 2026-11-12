from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_provider
from app.core.security import create_access_token
from app.db.session import get_db
from app.modules.auth.schemas import LoginRequest, ProviderRead, TokenResponse
from app.modules.auth.service import authenticate_provider
from app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_provider(db, payload.email, payload.password)
    access_token, expires_in = create_access_token(user.id, user.role.value)
    return TokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=ProviderRead.model_validate(user),
    )


@router.get("/me", response_model=ProviderRead)
def read_current_provider(user: User = Depends(get_current_provider)) -> User:
    return user
