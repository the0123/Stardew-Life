import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.farm import FarmState
from app.models.task import InviteCode, Session
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.services.farm_engine import create_initial_state

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_COOKIE = "refresh_token"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE,
        value=token,
        httponly=True,
        secure=False,  # flip to True once HTTPS is configured
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
    )


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    invite_result = await db.execute(
        select(InviteCode).where(InviteCode.code == body.invite_code, InviteCode.used_by == None)  # noqa: E711
    )
    invite = invite_result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or already used invite code")
    if invite.expires_at and invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite code expired")

    existing = await db.execute(
        select(User).where(or_(User.email == body.email, User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already taken")

    # First registered user becomes admin
    count = (await db.execute(select(func.count()).select_from(User))).scalar()

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        is_admin=(count == 0),
    )
    db.add(user)
    await db.flush()

    invite.used_by = user.id
    db.add(FarmState(user_id=user.id, state=create_initial_state()))

    refresh = generate_refresh_token()
    db.add(Session(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))
    await db.commit()

    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=create_access_token(user.id, user.username))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    refresh = generate_refresh_token()
    db.add(Session(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))
    await db.commit()

    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=create_access_token(user.id, user.username))


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        result = await db.execute(select(Session).where(Session.token_hash == hash_token(refresh_token)))
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
    response.delete_cookie(_COOKIE)
    return {"status": "logged out"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    result = await db.execute(select(Session).where(Session.token_hash == hash_token(refresh_token)))
    session = result.scalar_one_or_none()
    if not session or session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_refresh = generate_refresh_token()
    session.token_hash = hash_token(new_refresh)
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    await db.commit()

    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=create_access_token(user.id, user.username))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
