import json
import logging
from datetime import date

from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.farm import FarmState
from app.models.push import PushSubscription
from app.models.user import User
from app.services.farm_engine import apply_daily_tick, get_withering_tiles

logger = logging.getLogger(__name__)


def send_push(endpoint: str, p256dh: str, auth: str, payload: dict) -> None:
    if not settings.vapid_private_key:
        return
    try:
        webpush(
            subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": f"mailto:{settings.vapid_claims_email}"},
        )
    except WebPushException as e:
        logger.warning("Push failed for %s: %s", endpoint, e)


async def notify_withering_crops(db: AsyncSession) -> None:
    today = date.today()
    result = await db.execute(select(FarmState, User).join(User, FarmState.user_id == User.id))
    for farm_state, user in result.all():
        withering = get_withering_tiles(apply_daily_tick(farm_state.state, today))
        if not withering:
            continue
        subs = await db.execute(
            select(PushSubscription).where(PushSubscription.user_id == user.id)
        )
        crop_names = ", ".join(t["type"].replace("_", " ") for t in withering[:3])
        for sub in subs.scalars().all():
            send_push(
                sub.endpoint,
                sub.p256dh,
                sub.auth,
                {
                    "title": "Stardew Life — Crops Withering!",
                    "body": f"Your {crop_names} need attention or they'll disappear.",
                },
            )
