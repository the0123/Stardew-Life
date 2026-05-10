# Stardew Life

A Stardew Valley-themed life gamification app. Log real-world tasks across four life categories — health, work, learning, and social — and watch crops grow on a virtual farm dashboard. Neglect a category for three days and those crops wither. Keep up your habits and your farm thrives.

Built as a mobile-first PWA, self-hosted, and invite-only.

---

## Getting Access

Stardew Life is invite-only. To join, you need an invite code from the admin.

1. **Request an invite** — contact the admin to generate a code for you. Codes are single-use and expire after use.
2. **Go to the app** — navigate to the app URL and click **Sign Up**.
3. **Register** — enter your desired username, email, password, and the invite code. Your farm is created automatically on registration.

> Invite codes are managed by the admin via the `/admin` panel or the API. Each code can only be used once.

---

## Logging Tasks

Once logged in, tap the **+** button to log a task.

- **Category** — pick the life area the task belongs to:
  - Health & Fitness
  - Work & Productivity
  - Learning & Growth
  - Social & Relationships
- **Effort level** — how long it took:
  - Quick (≤15 min) — 10 XP
  - Medium (30–60 min) — 25 XP
  - Deep (1+ hour / milestone) — 50 XP
- **Title** — a short description of what you did.

Each logged task plants or advances a crop on your farm in the matching category's section.

---

## Crop Lifecycle

```
Log a task → Seed → Sprout → Grown → Harvest (gold + XP)

3 days without logging in a category → Withered (warning)
4 days without logging               → Crop disappears
```

Wither state is evaluated each time your farm is loaded. Harvest fully-grown crops to collect gold and XP.

---

## Viewing Friends' Farms

Every user has a public farm profile at `/farm/<username>`. No login is required to view it — share your farm URL with anyone.

---

## Push Notifications

To receive wither alerts:

1. When prompted, allow notifications in your browser.
2. **iOS users**: Push notifications only work on iOS 16.4+ when the app is added to your Home Screen. Tap the share icon in Safari → *Add to Home Screen*, then enable notifications from there.

---

## Self-Hosting

### Requirements

- Docker and Docker Compose
- A `.env` file (copy from `.env.example` and fill in values)

### Start

```bash
docker compose up -d
```

### First-time setup

The API requires the database schema to exist before it can start. On a fresh install the API will crash-loop until migrations are applied — this is expected.

**1. Run migrations** using a one-off container (the API doesn't need to be running for this):

```bash
docker compose run --rm api alembic upgrade head
```

**2. Restart the API** after migrations complete:

```bash
docker compose up -d --force-recreate api
```

**3. Get your bootstrap invite code** — on first startup with no users, the API generates a one-time code and prints it to the logs:

```bash
docker compose logs api | grep BOOTSTRAP
```

**4. Register** at `http://<host>:9009` using that code. The first account created is automatically granted admin.

From there, use the `/admin` panel to generate invite codes for everyone else.

> **Note:** `ALLOWED_ORIGINS` in your `.env` must be a JSON array, not a plain string:
> ```
> ALLOWED_ORIGINS=["http://your-host:9009"]
> ```

### Useful commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f frontend

# Rebuild after code changes
docker compose build api && docker compose up -d api

# Full restart (keeps data)
docker compose down && docker compose up -d
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Database | PostgreSQL 16 |
| Auth | bcrypt + JWT (httpOnly refresh cookie) |
| Notifications | Web Push API + VAPID |
| Container | Docker Compose |
