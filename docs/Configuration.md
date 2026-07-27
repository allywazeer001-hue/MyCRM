# Configuration Reference

All configuration is via environment variables. Never commit `.env` or `.env.local`.

---

## Backend: `backend/.env`

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `mysql://root:@127.0.0.1:3306/enterprise_crm` | Prisma connection string |
| `JWT_SECRET` | `change-me-32-chars-minimum` | Signs access tokens (24h expiry) |
| `JWT_REFRESH_SECRET` | `another-secret` | Signs refresh tokens (7d expiry) |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin(s), comma-separated |
| `PORT` | `4000` | HTTP port for NestJS |
| `NODE_ENV` | `development` or `production` | Controls logging verbosity |

### Optional — Queue

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | BullMQ job queue connection |

> Without Redis, workflow execution and bulk import jobs will fail. The rest of the app works.

### Optional — AI/OCR

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key. Required for OCR document extraction in forms. Get one at console.anthropic.com |

### Optional — Google Calendar / Sheets

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | Must match the authorized redirect URI in Google Console. Production: `https://your-domain.com/api/v1/calendar-sync/auth/callback` |

### Optional — SMTP

SMTP is configured **per-organization** inside the app (Settings → Email). There is no global SMTP env variable — organizations bring their own credentials.

---

## Frontend: `mycrm/.env.local`

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Base URL for the frontend itself (used for absolute URLs in emails, etc.) |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Only if any server-side Next.js routes call Claude directly |

> The Next.js proxy rewrites `/api/v1/*` → `http://localhost:4000/api/v1/*`, so the frontend never needs to know the backend URL directly.

---

## Production Overrides

On Railway / VPS, set these additional values:

```env
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:3306/dbname
FRONTEND_URL=https://app.yourdomain.com
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/v1/calendar-sync/auth/callback
```

On Netlify (frontend), set:
```
NEXT_PUBLIC_API_URL=https://app.yourdomain.com
```

And update `mycrm/next.config.ts` proxy destination:
```ts
destination: 'https://api.yourdomain.com/api/v1/:path*'
```

---

## Security Notes

- `JWT_SECRET` must be at least 32 characters. Use `openssl rand -hex 32` to generate.
- Rotate `JWT_SECRET` causes all existing sessions to invalidate — users must log in again.
- `ANTHROPIC_API_KEY` carries billing liability. Restrict it to the backend only; never expose in frontend bundles.
- Store production secrets in your hosting provider's secret manager, not in files checked into git.
