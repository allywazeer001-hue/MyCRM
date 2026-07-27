# File Storage

Files are stored on the local filesystem under `backend/uploads/`.

---

## Upload Endpoints

| Endpoint | Purpose | Max Size |
|----------|---------|----------|
| `POST /files/upload` | Record attachments | 10 MB |
| `POST /gallery/upload` | Gallery images | 10 MB |
| `POST /portal/documents` | Portal user documents | 10 MB |
| `POST /public/forms/:token/extract-document` | OCR document | 10 MB |

All upload endpoints accept `multipart/form-data`.

---

## Storage Structure

```
backend/uploads/
└── records/
    └── {orgId}/
        └── {timestamp}-{random}-{originalname}
```

The `File` model stores:
- `url`: The path used to access the file (e.g., `/api/v1/files/serve/{orgId}/{filename}`)
- `path`: Absolute path on disk
- `originalName`: Original filename from the upload
- `mimeType`, `size`

---

## Serving Files

Files are served via:
```
GET /api/v1/files/serve/:orgId/:filename
GET /api/v1/gallery/serve/:orgId/:filename
```

These endpoints require **no authentication** — the URL itself is the access control (long random token in the filename). Keep file URLs private.

---

## Multer Configuration

The backend uses `multer` with `diskStorage`:
```typescript
destination: (req, file, cb) => {
  cb(null, `uploads/records/${orgId}/`)
},
filename: (req, file, cb) => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  cb(null, `${uniqueSuffix}-${file.originalname}`)
}
```

---

## Production Considerations

### Persistence

If running in a container or on a PaaS (Railway), the `uploads/` directory is **ephemeral** by default. Set up a persistent volume:

```yaml
# docker-compose.yml
volumes:
  - ./backend/uploads:/app/uploads
```

On Railway, attach a persistent volume to the `/app/uploads` path.

### Backup

Include `backend/uploads/` in your backup routine. See [Backup-Recovery.md](Backup-Recovery.md).

### Cloud Storage (Future)

The current implementation uses local disk. For production scalability, swap `multer diskStorage` for an S3-compatible provider (AWS S3, Cloudflare R2, MinIO). This requires code changes in the files service — the `url` field would point to the CDN instead of the local serve endpoint.

---

## Gallery

The gallery (`/gallery`) is a media library for the organization. Gallery files are stored under `uploads/gallery/{orgId}/`.

Gallery features:
- Category organization
- Tag-based search
- Download count tracking
- Archive/unarchive
- Used as cover images for Publications

---

## Portal Documents

Portal users can upload documents that are stored as `PortalDocument` records. These are linked to the portal user and optionally to a CRM record.

Admins can view portal documents via `GET /portal/padmin/documents`.

---

## File Size Limits

The 10 MB limit is set in `backend/src/main.ts`:
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

To increase it, update both the Express limits and the Multer config in the relevant service.
