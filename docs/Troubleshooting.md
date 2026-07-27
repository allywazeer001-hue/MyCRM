# Troubleshooting

Common issues and their fixes.

---

## Backend Won't Start

### `P1001: Can't reach database server at 127.0.0.1:3306`

MySQL is not running.
- **XAMPP**: Open XAMPP Control Panel → Start MySQL
- **Linux**: `sudo systemctl start mysql`
- **Docker**: `docker-compose up -d db`

Also check `DATABASE_URL` in `backend/.env` matches your MySQL credentials.

### `Cannot find module '...'`

Dependencies not installed.
```bash
cd backend && npm install
```

### `Prisma client not generated`

```bash
cd backend && npx prisma generate
```

### `Port 4000 already in use`

```bash
# Find and kill the process
npx kill-port 4000   # or
lsof -ti:4000 | xargs kill
```

Or change `PORT` in `backend/.env`.

---

## Frontend Won't Start

### `Module not found`

```bash
cd mycrm && npm install
```

### `NEXT_PUBLIC_API_URL is not defined`

Create `mycrm/.env.local` with at least:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### `ProxyError: connect ECONNREFUSED 127.0.0.1:4000`

The backend is not running. Start it first:
```bash
cd backend && npm run start:dev
```

---

## Authentication Issues

### `401 Unauthorized` on all requests

- Token has expired — log out and log in again
- `JWT_SECRET` in `backend/.env` changed — all existing tokens are invalid

### Can't login after changing `JWT_SECRET`

All sessions are invalidated. Users must log in again. This is expected behavior.

### "Account locked / suspended"

An admin must unsuspend/unlock via `PATCH /users/:id/unsuspend` or `PATCH /users/:id/unlock`.

---

## OCR / Document Extraction

### "Document extraction is not configured"

`ANTHROPIC_API_KEY` is missing from `backend/.env`.
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```
Restart the backend after adding.

### "Could not extract data. Please try again or fill manually."

- The uploaded file may be too small, low quality, or in an unsupported format
- Claude may have timed out — retry
- Check the backend logs for the actual error: `npm run start:dev` shows Claude API responses

### Radio/select fields not pre-selected after OCR

- Ensure `ANTHROPIC_API_KEY` is set in `backend/.env` (not just `mycrm/.env.local`)
- The OCR prompt now includes exact option values — check that the form's field options are saved correctly in the builder

---

## Form Submission

### "Form not found" on public form

- The form token may have been revoked: `POST /forms/:id/generate-token` to create a new one
- The form may be inactive: check `Form.isActive` in Settings → Forms

### Fields not saving to a module

- The form must have a `moduleId` set (configure in Form Builder → Settings tab)
- The linked module must exist and be active

---

## Database / Prisma

### Migration errors

```bash
# Check pending migrations
npx prisma migrate status

# Apply pending
npx prisma migrate deploy

# If schema is out of sync with DB (dev only — DESTRUCTIVE)
npx prisma migrate reset
```

### `Unique constraint failed`

Trying to create a duplicate record on a unique field (e.g., email, slug).
Check the error message for the field name and fix the input.

### Prisma client out of sync after schema change

```bash
npx prisma generate
```

Then restart the backend.

---

## WebSocket

### No real-time updates

- Ensure Redis is running (BullMQ uses Redis; WebSocket does not, but notifications may route through it)
- Check browser console for Socket.io connection errors
- The frontend connects to `window.location.origin` — ensure the backend is reachable on the same domain/port in production

---

## File Uploads

### `413 Request Entity Too Large`

File exceeds the 10 MB limit. Either reduce file size or increase the limit in `backend/src/main.ts`:
```typescript
app.use(express.json({ limit: '20mb' }));
```

### Uploaded files not accessible

- Check that `backend/uploads/` is writable by the Node process
- In production, verify the volume is mounted and persistent

---

## Performance

### Slow record list queries

- Add database indexes on fields you frequently filter/sort by
- Use `npx prisma studio` to inspect the data volume
- Consider adding `limit` to queries (default pagination is 25 or 50 records)

### BullMQ jobs stuck in queue

- Verify Redis is running: `redis-cli ping` should return `PONG`
- Check `REDIS_URL` in `backend/.env`
- Jobs will re-run on backend restart if Redis is unavailable

---

## Logs

```bash
# Backend logs (development)
cd backend && npm run start:dev

# Backend logs (PM2 production)
pm2 logs crm-backend

# Frontend logs
cat mycrm/frontend.log   # if configured

# MySQL slow query log (if enabled)
tail -f /var/log/mysql/mysql-slow.log
```
