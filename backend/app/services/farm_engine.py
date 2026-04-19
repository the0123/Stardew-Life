import copy
from datetime import date, datetime

CATEGORY_CROPS = {
    "health":   ["wheat", "corn", "pumpkin"],
    "work":     ["parsnip", "cauliflower", "starfruit"],
    "learning": ["blueberries", "blueberries", "ancient_fruit"],
    "social":   ["fairy_rose", "fairy_rose", "sweet_gem_berry"],
}

EFFORT_XP = {"quick": 10, "medium": 25, "deep": 50}
EFFORT_TIER = {"quick": 0, "medium": 1, "deep": 2}

WITHER_DAYS = 3
DIE_DAYS = 4

LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4000, 5500]


def create_initial_state() -> dict:
    return {
        "grid": [[None] * 8 for _ in range(6)],
        "grid_size": {"rows": 6, "cols": 8},
        "season": "spring",
        "farm_day": 1,
        "xp": {"health": 0, "work": 0, "learning": 0, "social": 0},
        "total_level": 1,
        "gold": 0,
        "buildings": [],
        "inventory": {},
    }


def _calculate_level(total_xp: int) -> int:
    for i, threshold in enumerate(reversed(LEVEL_THRESHOLDS)):
        if total_xp >= threshold:
            return len(LEVEL_THRESHOLDS) - i
    return 1


def _find_empty_tile(grid: list) -> tuple[int, int] | None:
    for r, row in enumerate(grid):
        for c, tile in enumerate(row):
            if tile is None:
                return (r, c)
    return None


def _days_since(date_str: str, today: date) -> int:
    return (today - date.fromisoformat(date_str)).days


def apply_daily_tick(state: dict, today: date) -> dict:
    """Check all tiles for wither/death. Call on farm read and from the daily scheduler."""
    state = copy.deepcopy(state)
    grid = state["grid"]
    gold_earned = 0

    for row in grid:
        for i, tile in enumerate(row):
            if tile is None:
                continue
            days = _days_since(tile["last_tended"], today)
            if tile["stage"] == 3:
                gold_earned += 10
                row[i] = None
            elif days >= DIE_DAYS:
                row[i] = None
            elif days >= WITHER_DAYS and tile["stage"] != -1:
                tile["stage"] = -1

    state["gold"] += gold_earned
    state["grid"] = grid
    return state


def apply_task(state: dict, category: str, effort: str, now: datetime) -> dict:
    """Pure function. Apply a logged task to farm state, return updated state."""
    state = copy.deepcopy(state)
    today = now.date().isoformat()

    xp_gained = EFFORT_XP[effort]
    state["xp"][category] += xp_gained
    state["total_level"] = _calculate_level(sum(state["xp"].values()))

    grid = state["grid"]

    # Advance un-tended crops of this category
    for row in grid:
        for tile in row:
            if tile and tile["category"] == category and tile["last_tended"] != today:
                if tile["stage"] >= 0:
                    tile["last_tended"] = today
                    if tile["stage"] < 3:
                        tile["stage"] += 1

    # Plant new seed
    tier = EFFORT_TIER[effort]
    crops = CATEGORY_CROPS[category]
    crop_type = crops[min(tier, len(crops) - 1)]
    empty = _find_empty_tile(grid)
    if empty:
        r, c = empty
        grid[r][c] = {
            "type": crop_type,
            "stage": 0,
            "category": category,
            "planted_at": today,
            "last_tended": today,
        }

    state["grid"] = grid
    return apply_daily_tick(state, now.date())


def get_withering_tiles(state: dict) -> list[dict]:
    """Return tiles currently in withered state (for push notifications)."""
    return [
        tile
        for row in state["grid"]
        for tile in row
        if tile and tile["stage"] == -1
    ]
