# Changelog

## [Unreleased]

### Added
- Field Rules engine: conditional show/hide/set-value rules per module
- Blueprint task queue extensions (priority, due date, sent note, title)

---

## 2026-07-02

### Added
- `ticketNumber` field on `FormSubmission` — auto-assigned reference number for submissions

---

## 2026-07-01

### Added
- Field Rules: `FieldRule` model, service, controller, and frontend rule builder
- Extended `BlueprintTask` with `title`, `priority`, `dueDate`, `seenAt`, `processedAt`, `requestType`, `sentNote`
- Purge migration for soft-deleted blueprints

---

## 2026-06-30

### Added
- Team roles via Global List (replaces hard-coded team role enum)
- Blueprint and Request tracking fields

### Changed
- Team roles are now managed through the Global Lists system rather than a separate DB table

---

## 2026-06-29

### Added
- Record routing system (`RecordRoutingConfig`, `RecordRoutingController`)
- Email design field on email templates
- Workflow SEND_EMAIL action with template + merge tag support

---

## 2026-06-25

### Added
- Email system: `EmailTemplate`, `EmailLog`, `SmtpSettings` models
- Email Templates UI (`/settings/email`)
- Send email from record detail
- Email history view

---

## 2026-06-22

### Added
- Submission Receipt: printable confirmation page after form submission (replaces ticket success screen)
- OCR Upload tab in Form Builder (renamed from "Documents")
- Submission Receipt tab in Form Builder (renamed from "Ticketing")

### Fixed
- Radio button selection reliability (replaced `<label>/<input>` pattern with `<div role="radio">`)
- OCR not pre-selecting RADIO/SELECT fields (case mismatch in option values)
- "Document extraction is not configured" error when `ANTHROPIC_API_KEY` only in frontend `.env.local`

### Changed
- Form Builder drag-and-drop: entire card is now draggable (not just a handle)
- Drop indicator shows as a line at the insertion point
- Right-edge resize handle toggles field width 50%/100%
- Filled form fields show green border + checkmark icon

---

## 2026-06-15

### Added
- Publications & Gallery module (announcements, news feed, media library)
- Portal customer-facing pages builder
- Portal user management

---

## 2026-05-23

### Added
- Initial schema: Organization, User, DynamicModule, Field, Record, Workflow, Blueprint, Form, Dashboard, Analytics
- Multi-tenant JWT authentication
- Permission matrix system
- Global Lists with hierarchy support
- Form builder with public form submission
- Workflow automation engine
- Blueprint stage workflow
- Portal (customer-facing) authentication and pages
- Workspace (tasks, notes, calendar)
- Performance Tracker
- Request engine (service requests with blueprints)
- Real-time WebSocket notifications
- Google Calendar sync
- CSV import/export
- Audit logging
