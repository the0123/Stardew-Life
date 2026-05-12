import secrets
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.task import InviteCode
from app.models.user import User
from app.routers import admin, auth, farm, health, tasks
from app.routers import push as push_router
from app.services.push import notify_withering_crops

scheduler = AsyncIOScheduler()


async def _daily_wither_check() -> None:
    async with AsyncSessionLocal() as db:
        await notify_withering_crops(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count()).select_from(User))).scalar()
        if count == 0:
            code = f"BOOTSTRAP-{secrets.token_urlsafe(8)}"
            db.add(InviteCode(code=code))
            await db.commit()
            print(f"\n{'=' * 60}")
            print(f"  BOOTSTRAP INVITE CODE: {code}")
            print(f"  Use this to register the first admin account.")
            print(f"{'=' * 60}\n", flush=True)

    scheduler.add_job(_daily_wither_check, "cron", hour=8, minute=0)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Stardew Life API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(farm.router)
app.include_router(tasks.router)
app.include_router(admin.router)
app.include_router(push_router.router)
