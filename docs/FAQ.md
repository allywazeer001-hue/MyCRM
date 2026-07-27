# Frequently Asked Questions

## General

**Q: What is this platform?**
A metadata-driven, multi-tenant CRM/ERP. Organizations can create custom data modules (tables), define their own fields, build automated workflows, and publish forms — all without writing code.

**Q: Is this a SaaS or self-hosted product?**
Both. It can be self-hosted on any server or VPS, deployed to Railway + Netlify, or run locally with XAMPP. There's no license server or call-home mechanism.

**Q: What's the difference between a Module, a View, and a Record?**
- **Module**: The schema definition (like a database table). Example: "Contacts"
- **View**: A saved way of displaying records (table, kanban, calendar). Example: "Active Contacts"
- **Record**: One row of data in a module. Example: "Acme Corp"

---

## Users & Access

**Q: How do I create the first admin user?**
Register via the `/register` page on first launch. The first user automatically becomes SUPER_ADMIN.

**Q: Can I have multiple organizations?**
Yes. SUPER_ADMIN can create additional organizations. Each org is completely isolated.

**Q: What's the difference between CRM users and Portal users?**
- **CRM users** (staff) access the main dashboard at `/dashboard`. They're in the `users` table.
- **Portal users** (customers/external) access the customer portal at `/cf`. They're in the `portal_users` table with a separate login.

**Q: How do I give a user access to only specific modules?**
Use **User Permission Overrides** (Settings → Users → select user → Permissions). You can grant or deny access per module for that specific user, overriding their role's default.

---

## Forms

**Q: How do I share a form publicly?**
Go to Forms → select form → Builder → click "Generate Public Link". This creates a token-based URL anyone can access without logging in.

**Q: Can I pre-fill form fields from URL parameters?**
Yes. In the Form Builder, set a `URL Param Key` on any field. Then include `?fieldname=value` in the form URL.

**Q: Do form submissions create records automatically?**
Only if the form has a `moduleId` set in the Form Builder → Settings tab. If no module is selected, submissions are stored as `FormSubmission` rows only (not as CRM records).

**Q: What is a Submission Receipt?**
A printable confirmation page shown after the form is submitted successfully. Enable it in Form Builder → Submission Receipt tab. It shows an application ID, timestamp, and all submitted values.

---

## OCR

**Q: What file types does OCR support?**
PDF, JPEG, PNG, WebP, and GIF — any format Anthropic Claude's vision supports.

**Q: Why are some fields not pre-filled by OCR?**
- The field wasn't selected in the OCR Upload configuration
- The document doesn't contain visible data for that field
- The extracted value didn't match any option (for SELECT/RADIO fields)

**Q: How accurate is OCR?**
Very accurate for typed/printed documents. Handwritten text may have lower accuracy. Always let users review and correct OCR results before submitting.

---

## Workflows & Blueprints

**Q: What's the difference between a Workflow and a Blueprint?**
- **Workflow**: Automated actions triggered by events (no human needed). Example: "When status changes to 'approved', send an email."
- **Blueprint**: A multi-stage process requiring human approval at each stage. Example: Leave request → HR review → Manager approval → Approved.

**Q: Can a workflow trigger another workflow?**
Yes, using the `TRIGGER_WORKFLOW` action type.

**Q: How do I debug a failing workflow?**
Check `GET /workflows/:id/executions` — each execution stores its input, output, and error details.

---

## Data & Storage

**Q: Where are uploaded files stored?**
In `backend/uploads/` on the server running the NestJS backend. In production, mount a persistent volume to this directory.

**Q: Can I import records from Excel/CSV?**
Yes. Use `GET /modules/:moduleId/records/import/template` to download the CSV template, fill it in, then `POST /modules/:moduleId/records/import/run` to import.

**Q: What happens when I delete a record?**
By default, it's soft-deleted (`isDeleted: true`) — it appears in the trash and can be restored. Use "Permanent Delete" to hard-delete.

---

## Technical

**Q: Does this require Redis?**
Redis is used for BullMQ job queues (workflow execution, bulk imports). Without Redis, these features fail. The rest of the app works without Redis.

**Q: Can I run this without an Anthropic API key?**
Yes. The key is only required for OCR document extraction. All other features work without it.

**Q: Is WebSocket required?**
No. The app works without WebSocket (real-time updates just won't push). The Socket.io connection is established from the frontend and gracefully handles connection failures.

**Q: How do I reset everything for a fresh start?**
```bash
cd backend
npx prisma migrate reset   # WARNING: drops and recreates all tables
```
This is destructive and irreversible. Only use in development.
