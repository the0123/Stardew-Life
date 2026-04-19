# Stardew Life — Product Specification

## Overview

A Stardew Valley-themed life gamification web app. Users log real-world tasks across four life categories; each logged task plants and grows a corresponding crop on a virtual farm dashboard. Neglect a category for 3+ days and those crops wither and disappear. The farm is a visual mirror of your life habits.

Built as a mobile-first PWA, self-hosted in Docker Compose, accessible to a small invite-only friend group who can view each other's farms.

---

## Core Mechanic

1. User logs a task (category + description + effort level)
2. Backend calculates XP, updates farm state
3. A crop in the matching category is planted or advanced a growth stage
4. Crops not tended for 3 consecutive days enter a **withered** state (visual warning)
5. After 1 more day withered (4 days total neglect), the crop disappears permanently
6. Harvested fully-grown crops award gold and XP

---

## Task Categories → Crop Mapping

| Life Category        | Crops                          | Buildings/Animals   |
|----------------------|--------------------------------|----------------------|
| Health & Fitness     | Wheat, Corn, Pumpkin           | —                    |
| Work & Productivity  | Parsnip, Cauliflower, Starfruit| Tool Shed            |
| Learning & Growth    | Blueberries, Ancient Fruit     | Library              |
| Social & Relationships| Fairy Rose, Sweet Gem Berry   | Chicken Coop         |

Effort levels map to XP tiers:
- **Quick** (15 min or less) → 10 XP, plants common crop
- **Medium** (30–60 min) → 25 XP, plants mid-tier crop
- **Deep** (1+ hour / milestone) → 50 XP, plants rare crop

---

## Crop Lifecycle

```
Logged task
    │
    ▼
[Seed] ──── log again next day ──▶ [Sprout] ──── log again ──▶ [Grown] ──▶ Harvest (gold + XP)
    │
    └── 3 days without logging in category
              │
              ▼
          [Withered] ── 1 more day neglected ──▶ [Gone] (tile emptied)
```

Push notification sent when a crop enters withered state.

---

## Tech Stack

| Layer        | Choice                     | Rationale                                                         |
|--------------|----------------------------|-------------------------------------------------------------------|
| Backend      | Python 3.12 + FastAPI      | Team's primary language; FastAPI is modern, async, portfolio-ready|
| Frontend     | React 18 + Vite (TypeScript)| Largest ecosystem; best recruiter recognition; PWA support        |
| Database     | PostgreSQL 16              | Normalized tables for users/activity; JSONB for farm state        |
| State Mgmt   | Zustand                    | Lightweight, no boilerplate, works well with React                |
| Styling      | Tailwind CSS               | Utility-first, fast to build mobile UIs                           |
| Farm Render  | HTML/CSS grid + sprite sheets | Dashboard model, not a game engine; fully inspectable in DevTools|
| Auth         | Local accounts (bcrypt + JWT)| No external deps; invite-only via admin-created codes             |
| Notifications| Web Push API (service worker)| Zero cost; native OS notifications on Android                     |
| Container    | Docker Compose (3 services)| API + Nginx/React + Postgres                                      |
| Reverse Proxy| Caddy (host-level)         | Automatic HTTPS on self-hosted VPS                                |

---

## Database Schema

### Normalized Tables

```sql
-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_admin    BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (JWT refresh tokens stored server-side for revocation)
CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Invite codes (admin creates, user consumes once)
CREATE TABLE invite_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT UNIQUE NOT NULL,
    created_by  UUID REFERENCES users(id),
    used_by     UUID REFERENCES users(id),
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log (normalized, queryable history)
CREATE TABLE task_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL CHECK (category IN ('health','work','learning','social')),
    title       TEXT NOT NULL,
    effort      TEXT NOT NULL CHECK (effort IN ('quick','medium','deep')),
    xp_earned   INTEGER NOT NULL,
    logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Push subscriptions
CREATE TABLE push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Farm State (JSONB)

One row per user. The entire farm grid and inventory live here; updated atomically on each task log.

```sql
CREATE TABLE farm_states (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state       JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**JSONB State Shape:**

```json
{
  "grid": [
    [
      {
        "type": "wheat",
        "stage": 2,
        "category": "health",
        "planted_at": "2026-04-15",
        "last_tended": "2026-04-18"
      },
      null
    ]
  ],
  "grid_size": { "rows": 6, "cols": 8 },
  "season": "spring",
  "farm_day": 14,
  "xp": { "health": 450, "work": 230, "learning": 120, "social": 80 },
  "total_level": 7,
  "gold": 340,
  "buildings": ["tool_shed"],
  "inventory": { "wheat": 4, "blueberries": 1 }
}
```

`null` tiles are empty. `stage` goes 0 (seed) → 1 (sprout) → 2 (grown) → 3 (harvest-ready). Withered state is represented as `"stage": -1`.

---

## API Routes

All routes prefixed `/api/v1`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register with invite code |
| POST | `/auth/login` | Returns access + refresh JWT |
| POST | `/auth/logout` | Revokes session |
| POST | `/auth/refresh` | Rotates access token |

### Farm
| Method | Path | Description |
|--------|------|-------------|
| GET | `/farm/me` | Full farm state for current user |
| GET | `/farm/{username}` | Public farm view (friends) |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/tasks/log` | Log a task, returns updated farm state delta |
| GET | `/tasks/history` | Paginated task log for current user |
| GET | `/tasks/streak` | Current streak per category |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/invites` | Generate invite code |
| GET | `/admin/invites` | List all invite codes + usage |
| GET | `/admin/users` | List all users |

### Push Notifications
| Method | Path | Description |
|--------|------|-------------|
| POST | `/push/subscribe` | Register push subscription |
| DELETE | `/push/subscribe` | Unsubscribe |

---

## Frontend Architecture

```
src/
├── api/           # Axios client + typed request/response helpers
├── components/
│   ├── FarmGrid/  # CSS grid, tile components, sprite rendering
│   ├── TaskLogger/# Bottom sheet modal for logging tasks (mobile UX)
│   ├── StatsPanel/# XP bars, streaks, level display
│   ├── FriendFarm/# Read-only farm view for friend profiles
│   └── ui/        # Buttons, modals, toasts (shadcn/ui base)
├── hooks/         # useAuth, useFarm, usePush, useStreak
├── stores/        # Zustand: farmStore, authStore
├── pages/         # Home (own farm), Friend/:username, Login, Admin
└── sw/            # Service worker (push + offline caching)
```

### Mobile UX Patterns
- **Task logging**: FAB (floating action button) → bottom sheet with category selector + effort slider + title input. One-handed operation.
- **Farm grid**: Scrollable tile grid with tap-to-inspect crops (tooltip showing days until wither)
- **Navigation**: Bottom tab bar (Farm / Log / Friends / Profile)
- **Offline**: Service worker caches farm state; task logs queued and synced on reconnect

### Sprite System
- Sprite sheets stored in `public/sprites/` as PNG files
- One sheet per crop type (stages 0–3 + withered)
- CSS `background-position` shifts based on stage number
- Tile size: 64×64px on desktop, 48×48px on mobile

---

## Authentication Flow

```
Register:
  POST /auth/register { email, username, password, invite_code }
  → validates invite code (marks as used)
  → hashes password with bcrypt (cost factor 12)
  → creates user + farm_state row
  → returns access token (15min) + refresh token (30d, stored in httpOnly cookie)

Login:
  POST /auth/login { email, password }
  → verifies bcrypt hash
  → creates session row (stores hash of refresh token)
  → returns access token + httpOnly refresh cookie

Protected routes:
  Authorization: Bearer <access_token>
  → FastAPI dependency validates JWT signature + expiry

Token refresh:
  POST /auth/refresh (sends httpOnly cookie automatically)
  → validates refresh token hash against sessions table
  → rotates: issues new access token + new refresh token, revokes old session
```

---

## Notification Strategy

**Trigger events:**
1. Crop enters withered state (3 days no log in category)
2. Crop disappears (4 days — sent as a "you lost a crop" retrospective)

**Delivery:**
- Background task (APScheduler in FastAPI) runs daily at 08:00 user local time
- Queries farm states for withering crops across all users
- Sends Web Push via `py-vapid` + `pywebpush` library
- VAPID keys stored as environment variables

**iOS caveat:** Push notifications only work on iOS 16.4+ when the PWA is added to the Home Screen. Document this in the app's onboarding.

---

## Docker Compose Architecture

```
┌─────────────────────────────────────────────┐
│  Host: Caddy (reverse proxy + HTTPS)        │
│  yourdomain.com → localhost:80              │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  docker-compose    │
         │                    │
         │  ┌──────────────┐  │
         │  │   frontend   │  │  Nginx serving React build
         │  │   :80        │  │  /api/* → proxied to api:8000
         │  └──────┬───────┘  │
         │         │          │
         │  ┌──────▼───────┐  │
         │  │     api      │  │  FastAPI, Uvicorn workers
         │  │   :8000      │  │  
         │  └──────┬───────┘  │
         │         │          │
         │  ┌──────▼───────┐  │
         │  │   postgres   │  │  Postgres 16, volume-mounted
         │  │   :5432      │  │
         │  └──────────────┘  │
         └────────────────────┘
```

**Volumes:**
- `postgres_data` — database files (never deleted on `down`)
- `sprites` — optional bind mount if you want to update sprites without rebuild

**Environment variables (`.env` file, never committed):**
```
POSTGRES_USER=stardewlife
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=stardewlife
SECRET_KEY=<64-char-random>
VAPID_PRIVATE_KEY=<generated>
VAPID_PUBLIC_KEY=<generated>
VAPID_CLAIMS_EMAIL=your@email.com
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Social Features (v1)

- **Farm profiles**: Each user has a public URL `/farm/{username}` — read-only view of their current farm grid, level, total XP, and current season
- **No login required** to view a friend's farm (shareable link for portfolio demos)
- **Privacy**: No private mode in v1 — all farms are public by default

**Deferred to v2:**
- Activity feed (friends' recent task completions)
- XP leaderboard
- Farm visiting (see friend's farm from your own farm page)

---

## Phased Build Plan

### Phase 1 — Foundation
- Docker Compose setup (3 containers)
- FastAPI skeleton: auth routes, JWT middleware, Postgres connection
- Database migrations (Alembic)
- React + Vite scaffold with Tailwind, routing

### Phase 2 — Core Loop
- Task logging API + farm state engine (`farm_engine.py`)
- Farm grid component (CSS grid + placeholder sprites)
- Task logger bottom sheet (mobile UX)
- Crop lifecycle: planting, growing, withering, disappearing

### Phase 3 — Social + Polish
- Public farm profile pages
- Stats panel + XP/level display
- PWA setup (manifest + service worker)
- Push notification subscription + daily wither alerts
- Admin invite code management

### Phase 4 — Portfolio Ready
- Real pixel art sprites (or open-source Stardew-style assets)
- Onboarding flow for new users
- Mobile testing on real Android device
- README with setup instructions + live demo link

---

## Out of Scope (v1)

- Real-time multiplayer / WebSockets
- Activity feed or leaderboards
- iOS push notifications (document the limitation)
- Seasons progression system (farm is always spring in v1; seasonal state reserved in schema)
- Monetization of any kind
