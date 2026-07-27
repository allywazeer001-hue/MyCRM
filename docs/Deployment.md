# Deployment

The recommended stack is **Railway** (backend + database) + **Netlify** (frontend).

---

## Backend on Railway

### 1. Create a Railway project

```bash
npm install -g @railway/cli
railway login
railway init
```

### 2. Add services

In the Railway dashboard, add:
- **MySQL** service (Railway managed)
- **Redis** service (Railway managed)
- **Node.js** service pointed at `backend/`

### 3. Set environment variables

In the Railway Node.js service settings, add:

```
DATABASE_URL=<copied from Railway MySQL service>
REDIS_URL=<copied from Railway Redis service>
JWT_SECRET=<generate with openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate with openssl rand -hex 32>
FRONTEND_URL=https://your-app.netlify.app
PORT=4000
NODE_ENV=production
ANTHROPIC_API_KEY=<your key>
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
GOOGLE_REDIRECT_URI=https://<railway-domain>/api/v1/calendar-sync/auth/callback
```

### 4. Configure root directory

In Railway service settings, set **Root Directory** to `backend`.

### 5. Build and start commands

Railway auto-detects Node.js. Ensure `backend/package.json` has:

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  }
}
```

Railway runs `npm run build` then `npm run start:prod`.

### 6. Run migrations on deploy

Add a pre-deploy command or a one-off command after deploy:

```bash
npx prisma migrate deploy
```

---

## Frontend on Netlify

### 1. Connect repository

In Netlify dashboard → New site → import from Git.

### 2. Configure build settings

| Setting | Value |
|---------|-------|
| Base directory | `mycrm` |
| Build command | `npm run build` |
| Publish directory | `mycrm/.next` |

### 3. Environment variables

In Netlify → Site settings → Environment variables:

```
NEXT_PUBLIC_API_URL=https://your-app.netlify.app
```

### 4. Update backend proxy URL

In `mycrm/next.config.ts`, change the proxy destination for production:

```ts
{
  source: '/api/v1/:path*',
  destination: `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/v1/:path*`,
}
```

Add `BACKEND_URL=https://<railway-domain>` to Netlify env vars.

---

## Docker (Self-hosted)

A minimal `docker-compose.yml` for self-hosting:

```yaml
version: '3.9'
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: enterprise_crm
    volumes:
      - db_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: mysql://root:rootpass@db:3306/enterprise_crm
      REDIS_URL: redis://redis:6379
      JWT_SECRET: change-me
      JWT_REFRESH_SECRET: change-me-too
      FRONTEND_URL: http://localhost:3000
      PORT: 4000
      NODE_ENV: production
    ports:
      - "4000:4000"
    depends_on:
      - db
      - redis
    command: sh -c "npx prisma migrate deploy && node dist/main"

  frontend:
    build: ./mycrm
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
      BACKEND_URL: http://backend:4000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  db_data:
```

```bash
docker-compose up -d
```

---

## Post-Deployment Checklist

- [ ] Backend health: `GET https://api.yourdomain.com/api/v1/auth/check-email`
- [ ] Frontend loads and shows login
- [ ] Database migrations ran successfully
- [ ] First user registration works
- [ ] File uploads work (check `uploads/` volume is writable)
- [ ] WebSocket connects (check browser console for Socket.io errors)
- [ ] Email settings configured in org Settings → Email
