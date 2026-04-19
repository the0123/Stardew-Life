from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.deps import get_current_user
from app.models.farm import FarmState
from app.models.task import TaskLog
from app.models.user import User
from app.schemas.task import TaskLogRequest
from app.services.farm_engine import EFFORT_XP, apply_task

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.post("/log")
async def log_task(
    body: TaskLogRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    task = TaskLog(
        user_id=user.id,
        category=body.category,
        title=body.title,
        effort=body.effort,
        xp_earned=EFFORT_XP[body.effort],
        logged_at=now,
    )
    db.add(task)

    farm_result = await db.execute(select(FarmState).where(FarmState.user_id == user.id))
    farm = farm_result.scalar_one_or_none()
    if farm:
        farm.state = apply_task(farm.state, body.category, body.effort, now)
        flag_modified(farm, "state")

    await db.commit()
    await db.refresh(task)

    return {
        "task": {
            "id": str(task.id),
            "category": task.category,
            "title": task.title,
            "effort": task.effort,
            "xp_earned": task.xp_earned,
            "logged_at": task.logged_at.isoformat(),
        },
        "farm_state": farm.state if farm else None,
    }


@router.get("/history")
async def task_history(
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskLog)
        .where(TaskLog.user_id == user.id)
        .order_by(desc(TaskLog.logged_at))
        .limit(limit)
        .offset(offset)
    )
    return [
        {
            "id": str(t.id),
            "category": t.category,
            "title": t.title,
            "effort": t.effort,
            "xp_earned": t.xp_earned,
            "logged_at": t.logged_at.isoformat(),
        }
        for t in result.scalars().all()
    ]


@router.get("/streak")
async def get_streaks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta

    from sqlalchemy import cast
    from sqlalchemy.types import Date

    result = await db.execute(
        select(TaskLog.category, cast(TaskLog.logged_at, Date).label("log_date"))
        .where(TaskLog.user_id == user.id)
        .distinct()
        .order_by(TaskLog.category, desc("log_date"))
    )
    rows = result.all()

    today = date.today()
    streaks: dict[str, int] = {}
    for category in ["health", "work", "learning", "social"]:
        dates = sorted({r.log_date for r in rows if r.category == category}, reverse=True)
        streak = 0
        current = today
        for d in dates:
            if d >= current - timedelta(days=1):
                streak += 1
                current = d
            else:
                break
        streaks[category] = streak

    return streaks
