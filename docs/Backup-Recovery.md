# Backup & Recovery

## What Needs Backing Up

| Data | Location | Backup Method |
|------|----------|---------------|
| MySQL database | Wherever MySQL is hosted | `mysqldump` or managed backup |
| Uploaded files | `backend/uploads/` | File system / rsync / volume backup |
| Environment files | `backend/.env`, `mycrm/.env.local` | Secure secret manager |

The codebase itself is in Git and doesn't need separate backup.

---

## Database Backup

### Manual mysqldump

```bash
# Backup
mysqldump -u root -p enterprise_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
mysql -u root -p enterprise_crm < backup_2026_07_02_120000.sql
```

### Automated Daily Backup (Linux/cron)

```bash
# Add to crontab (crontab -e)
0 2 * * * mysqldump -u root enterprise_crm | gzip > /backups/crm_$(date +\%Y\%m\%d).sql.gz
# Keep last 30 days
0 3 * * * find /backups -name "crm_*.sql.gz" -mtime +30 -delete
```

### Managed Database Backups

- **Railway MySQL**: Enable automated backups in the Railway dashboard (available on paid plans)
- **PlanetScale / Neon**: Point-in-time recovery built in
- **AWS RDS**: Automated snapshots configurable to 1–35 day retention

---

## File Storage Backup

### rsync to remote

```bash
# Daily sync to a remote server
rsync -avz --delete backend/uploads/ user@backup-server:/backups/crm-uploads/
```

### To S3

```bash
# Using AWS CLI
aws s3 sync backend/uploads/ s3://your-bucket/crm-uploads/ --delete
```

### Docker Volume Backup

```bash
# Backup volume contents
docker run --rm -v crm_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads_$(date +%Y%m%d).tar.gz /data
```

---

## Recovery Procedures

### Restore Database

```bash
# 1. Stop the backend
pm2 stop crm-backend  # or docker-compose stop backend

# 2. Drop and recreate the database
mysql -u root -p -e "DROP DATABASE enterprise_crm; CREATE DATABASE enterprise_crm;"

# 3. Restore
mysql -u root -p enterprise_crm < backup_2026_07_02_120000.sql

# 4. Run any pending migrations (if backup is older than latest migration)
cd backend && npx prisma migrate deploy

# 5. Restart
pm2 start crm-backend
```

### Restore Files

```bash
rsync -avz user@backup-server:/backups/crm-uploads/ backend/uploads/
```

---

## Disaster Recovery Steps

1. Provision a new server / Railway project
2. Install Node.js, MySQL, Redis (or use managed services)
3. Clone the repository
4. Restore `.env` from your secret manager
5. Restore database from most recent backup
6. Run `npx prisma migrate deploy`
7. Restore uploaded files
8. Start backend and frontend
9. Verify login and data integrity

**Target RTO** (Recovery Time Objective): ~1–2 hours with this approach.
**Target RPO** (Recovery Point Objective): 24 hours with daily backups, or near-zero with managed DB point-in-time recovery.

---

## Testing Backups

Test restores quarterly:
1. Restore the backup to a staging environment
2. Run smoke tests (login, view records, submit a form)
3. Verify file attachments load correctly
4. Document restore time

Untested backups are not backups.

---

## Soft Delete as Safety Net

Records are soft-deleted (`isDeleted: true`) rather than hard-deleted. This gives a recovery window before a hard delete is issued. Recovery:

```typescript
// Un-delete via API
PATCH /api/v1/modules/:moduleId/records/:id
{ "isDeleted": false }
```

Or directly in the database:
```sql
UPDATE records SET is_deleted = 0, deleted_at = NULL WHERE id = 'record-id';
```
