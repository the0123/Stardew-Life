import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class TaskLogRequest(BaseModel):
    category: Literal["health", "work", "learning", "social"]
    title: str
    effort: Literal["quick", "medium", "deep"]


class TaskLogOut(BaseModel):
    id: uuid.UUID
    category: str
    title: str
    effort: str
    xp_earned: int
    logged_at: datetime

    model_config = {"from_attributes": True}
