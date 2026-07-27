# Future Roadmap

Planned features and improvements, roughly prioritized.

---

## Near-term

### S3/Cloud File Storage
Replace local disk storage (`backend/uploads/`) with S3-compatible object storage (AWS S3, Cloudflare R2, MinIO). This enables:
- Horizontal scaling (multiple backend instances sharing storage)
- CDN delivery for images
- Signed URLs with expiry for secure file access

### Brute-force Protection
Automatic account lockout after N failed login attempts. Currently only manual locking is supported.

### Signed File URLs
Replace security-by-obscurity file URLs with time-limited signed URLs that expire after access.

### Email Queue via BullMQ
Move email sending from synchronous SMTP calls to the BullMQ queue. Adds retry logic, delivery tracking, and rate limiting.

---

## Medium-term

### Mobile App
React Native app using the existing REST API. Focus on record creation, task management, and notifications.

### Advanced Formula Engine
Expand `FORMULA` field capabilities:
- Cross-record aggregations (e.g., SUM of related invoice amounts)
- IF/ELSE logic
- Date math (days since, due in X days)

### Bulk Import from Excel (.xlsx)
Currently only CSV is supported. Add `.xlsx` parsing via the `xlsx` npm package (already in frontend dependencies).

### AI Assistant
Natural language query interface:
- "Show me all contacts created this month with status Active"
- "Create a new lead for Acme Corp with priority High"
- Uses Claude function calling against the existing record API

### Two-factor Authentication (2FA)
TOTP (Google Authenticator / Authy) for CRM user accounts.

### Custom Domain for Portal
Allow organizations to serve their customer portal from a custom subdomain (e.g., `portal.client.com`).

---

## Long-term

### Offline Support (PWA)
Service worker + IndexedDB cache for basic record viewing/editing when offline. Sync on reconnect.

### Advanced Reporting
- Scheduled reports delivered by email
- PDF export of dashboards
- Report builder with drag-and-drop

### Multi-language (i18n)
UI localization for Arabic, French, Spanish. The backend already returns field labels from the database (not hardcoded), so database content is already configurable per org.

### Plugin / Extension System
Allow organizations to install custom modules from a marketplace without forking the codebase.

### Webhooks (Inbound)
Full bidirectional webhook support — receive webhooks from external services and trigger workflows.

### Calendar View Enhancements
- Drag-to-reschedule records on the calendar view
- Week and day views in addition to month view
- Sync to iCal format

---

## Completed ✓

- Multi-tenant JWT authentication
- Dynamic modules and fields
- Form builder with public submissions
- OCR document extraction (Anthropic Claude)
- Workflow automation engine
- Blueprint stage approval workflow
- Real-time WebSocket notifications
- Customer portal (PortalUser auth, pages, documents)
- Email templates + send from records
- Record routing queues
- Performance tracker
- Google Calendar sync
- Publications & gallery
