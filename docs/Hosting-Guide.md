# Hosting Guide

Comparison of hosting options for the CRM platform.

---

## Option 1: Railway + Netlify (Recommended)

**Best for**: Teams wanting managed infrastructure with minimal ops overhead.

| Service | What | Cost |
|---------|------|------|
| Railway | Backend NestJS app | ~$5–20/mo (usage-based) |
| Railway MySQL | Database | ~$5–10/mo |
| Railway Redis | Job queues | ~$5/mo |
| Netlify | Frontend Next.js | Free tier → $19/mo |

**Pros**: Zero server management, auto-deploys from Git, built-in SSL, easy env var management.

**Cons**: Railway is usage-based — spiky traffic can be expensive. Netlify requires a plugin for Next.js server components.

**Steps**: See [Deployment.md](Deployment.md) → Railway + Netlify sections.

---

## Option 2: VPS (Ubuntu)

**Best for**: Cost-sensitive deployments with predictable traffic. Full control.

### Recommended VPS providers
- Hetzner Cloud (CX21 = 2 vCPU, 4 GB RAM, €3.79/mo)
- DigitalOcean Droplet (2 vCPU, 2 GB RAM, $18/mo)
- Linode/Akamai

### Server setup

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install MySQL 8
sudo apt install mysql-server -y
sudo mysql_secure_installation

# 3. Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis

# 4. Install PM2 (process manager)
npm install -g pm2

# 5. Clone and build
git clone <repo> /var/www/crm
cd /var/www/crm/backend && npm ci && npx prisma migrate deploy && npm run build
cd /var/www/crm/mycrm && npm ci && npm run build

# 6. Start with PM2
pm2 start /var/www/crm/backend/dist/main.js --name crm-backend
pm2 start /var/www/crm/mycrm/node_modules/.bin/next --name crm-frontend -- start -p 3000
pm2 save && pm2 startup

# 7. Nginx reverse proxy
sudo apt install nginx -y
```

### Nginx config

```nginx
# /etc/nginx/sites-available/crm
server {
    listen 80;
    server_name app.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API (or handle proxy in Next.js)
    location /api/v1/ {
        proxy_pass http://localhost:4000/api/v1/;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 15M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo certbot --nginx -d app.yourdomain.com   # free SSL
sudo systemctl reload nginx
```

---

## Option 3: Docker Compose

**Best for**: Reproducible environments; easy team onboarding.

See the `docker-compose.yml` in [Deployment.md](Deployment.md).

For production, add:
- A named volume for `backend/uploads/` to persist files across deployments
- Health checks on the db service
- A deploy script that runs `prisma migrate deploy` before starting the backend

---

## Option 4: XAMPP (Local / Intranet Only)

**Best for**: Small office deployments on a Windows machine accessible over LAN.

1. Install XAMPP and start Apache + MySQL
2. Create the database in phpMyAdmin
3. Run the backend and frontend with `npm run start:dev` / `npm run dev`
4. Other machines on the LAN access via `http://<host-ip>:3000`

Update `backend/.env`:
```env
FRONTEND_URL=http://192.168.1.55:3000,http://localhost:3000
```

This is not recommended for internet-facing deployments — no SSL, no process manager.

---

## File Storage

The backend stores uploaded files in `backend/uploads/{orgId}/{filename}`.

For production, this directory must be:
- **Persistent**: If using containers, mount a volume.
- **Backed up**: See [Backup-Recovery.md](Backup-Recovery.md).
- **Writable**: Ensure the process user has write permission.

For high-availability setups, replace local storage with S3-compatible object storage (a code change is required to swap `multer` disk storage for S3 streaming).

---

## Minimum Hardware Requirements

| Tier | CPU | RAM | Storage | Use case |
|------|-----|-----|---------|----------|
| Small | 1 vCPU | 1 GB | 20 GB | <10 users, dev |
| Medium | 2 vCPU | 4 GB | 50 GB | <100 users |
| Large | 4 vCPU | 8 GB | 200 GB | <1000 users |
