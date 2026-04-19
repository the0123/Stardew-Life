from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.deps import get_current_user
from app.models.farm import FarmState
from app.models.user import User
from app.services.farm_engine import apply_daily_tick

router = APIRouter(prefix="/api/v1/farm", tags=["farm"])


async def _load_farm(user_id, db: AsyncSession) -> FarmState:
    result = await db.execute(select(FarmState).where(FarmState.user_id == user_id))
    farm = result.scalar_one_or_none()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    ticked = apply_daily_tick(farm.state, date.today())
    if ticked != farm.state:
        farm.state = ticked
        flag_modified(farm, "state")
        await db.commit()
        await db.refresh(farm)

    return farm


@router.get("/me")
async def get_my_farm(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    farm = await _load_farm(user.id, db)
    return {"user_id": str(farm.user_id), "state": farm.state, "updated_at": farm.updated_at}


@router.get("/{username}")
async def get_farm_by_username(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    farm = await _load_farm(user.id, db)
    return {
        "username": user.username,
        "display_name": user.display_name,
        "user_id": str(farm.user_id),
        "state": farm.state,
        "updated_at": farm.updated_at,
    }
