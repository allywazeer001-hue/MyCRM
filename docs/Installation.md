# Installation Guide

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | Use nvm or fnm to manage versions |
| npm | 10+ | Comes with Node.js |
| MySQL | 8.0+ | XAMPP, Docker, or native install |
| Redis | 7+ | Required for BullMQ job queues |
| Git | any | |

> **Windows with XAMPP**: MySQL is available via XAMPP Control Panel. Redis can be run with `wsl redis-server` or a Windows Redis build from https://github.com/tporadowski/redis/releases.

---

## Step 1 — Clone the Repository

```bash
git clone <repo-url> CRM
cd CRM
```

---

## Step 2 — Backend Setup

```bash
cd backend
npm install
```

### Create the database

```sql
-- In MySQL (via phpMyAdmin or mysql CLI):
CREATE DATABASE enterprise_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Configure environment

```bash
cp .env.example .env   # if example exists, otherwise create manually
```

Edit `backend/.env`:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/enterprise_crm"
JWT_SECRET="change-me-in-production"
JWT_REFRESH_SECRET="change-this-too"
REDIS_URL="redis://localhost:6379"
FRONTEND_URL="http://localhost:3000"
PORT=4000
NODE_ENV=development

# Optional — required only for OCR feature
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional — required only for Google Calendar sync
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/calendar-sync/auth/callback
```

### Run migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### Start the backend

```bash
npm run start:dev
```

Backend is now running on http://localhost:4000. Swagger docs at http://localhost:4000/api/docs.

---

## Step 3 — Frontend Setup

```bash
cd ../mycrm
npm install
```

### Configure environment

Create `mycrm/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-api03-...
```

> The `ANTHROPIC_API_KEY` in `.env.local` is for any frontend-side Claude calls. The main OCR feature uses the backend key.

### Start the frontend

```bash
npm run dev
```

Frontend is now running on http://localhost:3000.

---

## Step 4 — First Launch

1. Open http://localhost:3000
2. You'll be redirected to the registration page
3. Create the first user — this user becomes **SUPER_ADMIN**
4. The organization is auto-created during registration

---

## Verifying the Installation

```bash
# Backend health
curl http://localhost:4000/api/v1/auth/check-email -d '{"email":"test@test.com"}' -H "Content-Type: application/json"
# Should return { "exists": false }

# Frontend
open http://localhost:3000
# Should show the login page
```

---

## Troubleshooting Installation

**`P1001: Can't reach database server`**
- Ensure MySQL is running (XAMPP → MySQL → Start)
- Check the port in `DATABASE_URL` (default 3306)

**`Redis connection refused`**
- Start Redis: `redis-server` (Linux/Mac) or via WSL on Windows
- If Redis isn't available, BullMQ jobs will queue up but not execute

**`prisma generate` fails**
- Run from inside `backend/` directory
- Ensure `backend/node_modules` is installed

**Port conflicts**
- Change `PORT=4001` in `backend/.env` and update the proxy in `mycrm/next.config.ts`
