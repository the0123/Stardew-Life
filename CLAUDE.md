# Stardew Life — Claude Code Guide

## Project Summary

Stardew Valley-themed life gamification PWA. Users log real-world tasks → crops grow on a virtual farm dashboard. Built with FastAPI + React + PostgreSQL, self-hosted via Docker Compose, invite-only friend group social features.

See `SPEC.md` for full product specification.

## Repository

GitHub: https://github.com/the0123/Stardew-Life
Branch: `main`

**Git workflow:** After any significant change (new feature, bug fix, config change), commit and push to `main`. Commit messages use imperative mood: `add auth router`, `fix crop wither logic`. Always run `git status` before committing to avoid staging unintended files.

---

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, shadcn/ui
- **Database**: PostgreSQL 16 — normalized tables + JSONB for farm state
- **Auth**: bcrypt + JWT (access token 15min, refresh token 30d via httpOnly cookie)
- **Push**: pywebpush + VAPID keys
- **Container**: Docker Compose — 3 services (api, frontend, postgres)

---

## Directory Structure

```
stardew-life/
├── SPEC.md
├── CLAUDE.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml          # dependencies: fastapi, sqlalchemy, alembic, pydantic, bcrypt, pyjwt, pywebpush, apscheduler
│   ├── alembic.ini
│   ├── migrations/
│   └── app/
│       ├── main.py             # FastAPI app init, router registration, lifespan
│       ├── config.py           # Settings from env vars (pydantic BaseSettings)
│       ├── database.py         # Async SQLAlchemy engine + session dependency
│       ├── models/             # SQLAlchemy ORM models
│       │   ├── user.py
│       │   ├── farm.py         # farm_states table with JSONB state column
│       │   ├── task.py
│       │   └── push.py
│       ├── schemas/            # Pydantic request/response schemas
│       ├── routers/
│       │   ├── auth.py
│       │   ├── farm.py
│       │   ├── tasks.py
│       │   └── admin.py
│       ├── services/
│       │   ├── farm_engine.py  # Crop lifecycle logic — plant, advance, wither, harvest
│       │   └── push.py         # Web Push notification sender
│       └── deps.py             # FastAPI dependencies (get_current_user, get_db, require_admin)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf              # Serves React build; proxies /api to api:8000
│   ├── package.json
│   ├── vite.config.ts
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   ├── sw.js               # Service worker (push + offline)
│   │   └── sprites/            # Pixel art sprite sheets per crop type
│   └── src/
│       ├── api/                # Axios instance + typed API functions
│       ├── components/
│       │   ├── FarmGrid/       # CSS grid farm dashboard
│       │   ├── TaskLogger/     # FAB + bottom sheet for logging
│       │   ├── StatsPanel/     # XP bars, streaks, level
│       │   └── FriendFarm/     # Read-only public farm view
│       ├── hooks/
│       ├── stores/             # Zustand: farmStore, authStore
│       └── pages/
│           ├── Home.tsx        # Own farm
│           ├── Friend.tsx      # /farm/:username
│           ├── Login.tsx
│           └── Admin.tsx
```

---

## Key Commands

### Development (local, no Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev          # Vite dev server on :5173, proxies /api to :8000
```

### Docker

```bash
# Start all services
docker compose up -d

# Start with live-reload mounts (dev)
docker compose -f docker-compose.dev.yml up

# View logs
docker compose logs -f api
docker compose logs -f frontend

# Run migrations inside container
docker compose exec api alembic upgrade head

# Rebuild after code changes
docker compose build api && docker compose up -d api

# Full reset (keeps postgres volume)
docker compose down && docker compose up -d

# Nuclear reset (DELETES all data)
docker compose down -v
```

### Database

```bash
# Create new migration
docker compose exec api alembic revision --autogenerate -m "description"

# Apply migrations
docker compose exec api alembic upgrade head

# Rollback one step
docker compose exec api alembic downgrade -1

# Connect to postgres directly
docker compose exec postgres psql -U stardewlife -d stardewlife
```

### Frontend

```bash
cd frontend
npm run build        # Production build to dist/
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

---

## Environment Variables

Copy `.env.example` to `.env`. Never commit `.env`.

```bash
# Postgres
POSTGRES_USER=stardewlife
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=stardewlife
DATABASE_URL=postgresql+asyncpg://stardewlife:<password>@postgres:5432/stardewlife

# JWT
SECRET_KEY=<64-char-random-hex>       # openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173

# Web Push (VAPID)
VAPID_PRIVATE_KEY=<generated>
VAPID_PUBLIC_KEY=<generated>
VAPID_CLAIMS_EMAIL=your@email.com
# Generate: python -c "from pywebpush import Vapid; v=Vapid(); v.generate_keys(); print(v.private_key, v.public_key)"

# App
ENVIRONMENT=production   # or "development"
ADMIN_EMAIL=your@email.com   # First admin account seeded on startup
```

---

## Architecture Notes

### Farm State Engine (`app/services/farm_engine.py`)

The farm engine is the core domain logic. It takes:
- Current `farm_state` JSONB dict
- A `TaskLog` event (category, effort, timestamp)

And returns an updated `farm_state` dict. It must be a **pure function** — no DB calls, no side effects. The router calls it and then writes the result back to `farm_states`.

Key rules encoded here:
- Category → crop type mapping
- Effort level → XP + crop tier
- Stage advancement (0→1→2→3→harvest)
- Wither check: `days_since_tended >= 3` → stage = -1
- Disappear check: `days_since_tended >= 4` → remove tile
- Grid placement: find first empty `null` tile in row-major order

### JSONB Farm State

Farm state is read/written atomically. Use PostgreSQL's `jsonb_set` for partial updates if needed, but a full replacement on task log is acceptable at this scale.

Never query inside the JSONB for aggregations — use the normalized `task_logs` table for stats, streaks, and history.

### Auth Dependency Chain

```python
# deps.py pattern
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    ...

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403)
    return user
```

### Daily Wither Check (APScheduler)

Runs at 08:00 daily. Scans all `farm_states` for tiles where `last_tended` is 3+ days ago. Sends push notifications to affected users. Updates wither states in DB.

Register in `app/main.py` lifespan context manager — not as a background task.

### Nginx Config Pattern

The `frontend` container runs Nginx. It serves the React build and proxies API calls:

```nginx
location /api/ {
    proxy_pass http://api:8000/api/;
}
location / {
    try_files $uri $uri/ /index.html;   # SPA fallback
}
```

---

## Conventions

### Backend
- Async everywhere: `async def` routes, `AsyncSession`, `asyncpg` driver
- Pydantic v2 models for all request/response schemas — no raw dicts in route handlers
- Router files own their HTTP layer only; business logic lives in `services/`
- Use `uuid.UUID` for all IDs, never integer PKs
- Timestamps always `TIMESTAMPTZ` (UTC stored, frontend handles display timezone)

### Frontend
- TypeScript strict mode — no `any`
- API functions in `src/api/` return typed response objects matching backend Pydantic schemas
- Zustand stores are the single source of truth for farm state — never fetch and store in component local state
- Mobile-first CSS: design for 390px width, then scale up
- Sprite rendering: `<div className="tile" data-crop="wheat" data-stage="2">` — CSS handles the sprite sheet offset via `data-*` attribute selectors

### Git
- Branch names: `feat/`, `fix/`, `chore/`
- Commit messages: imperative mood, e.g. `add crop wither logic to farm engine`
- Never commit `.env`, `__pycache__`, `node_modules`, `dist/`, `.venv/`

---

## Sprite Sheet Convention

Sprite files live at `frontend/public/sprites/<crop-name>.png`.

Each sheet is 5 frames wide × 1 frame tall (320×64px at 64px per frame):
- Frame 0: seed
- Frame 1: sprout
- Frame 2: mid-growth
- Frame 3: harvest-ready
- Frame 4: withered

CSS background-position formula: `background-position-x: calc(<stage> * -64px)`

Use open-source Stardew Valley fan assets or generate with pixel art tools (Aseprite). The `sprites/` folder is gitignored if assets are large — document download instructions in README.

---

## Common Gotchas

- **JSONB mutations**: SQLAlchemy won't detect in-place dict mutations. Always reassign: `farm.state = {**farm.state, "grid": new_grid}` and call `flag_modified(farm, "state")`.
- **JWT on mobile**: Store access token in memory (Zustand), refresh token in httpOnly cookie. Never localStorage for tokens.
- **PWA push on iOS**: Only works on iOS 16.4+ when added to Home Screen. Show a banner prompting iOS users to add to Home Screen before subscribing to push.
- **Docker networking**: Services communicate by service name (`api`, `postgres`, `frontend`) — never `localhost` inside Docker Compose.
- **Alembic + async**: Use `run_sync` pattern for Alembic migrations with async SQLAlchemy engine.
