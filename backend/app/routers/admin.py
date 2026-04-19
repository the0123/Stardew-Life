import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_admin
from app.models.task import InviteCode
from app.models.user import User

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.post("/invites")
async def create_invite(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    code = secrets.token_urlsafe(16)
    invite = InviteCode(
        code=code,
        created_by=admin.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    await db.commit()
    return {"code": code, "expires_at": invite.expires_at.isoformat()}


@router.get("/invites")
async def list_invites(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InviteCode).order_by(InviteCode.created_at.desc()))
    return [
        {
            "code": i.code,
            "used": i.used_by is not None,
            "expires_at": i.expires_at.isoformat() if i.expires_at else None,
        }
        for i in result.scalars().all()
    ]


@router.get("/users")
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at))
    return [
        {"id": str(u.id), "username": u.username, "email": u.email, "is_admin": u.is_admin}
        for u in result.scalars().all()
    ]
