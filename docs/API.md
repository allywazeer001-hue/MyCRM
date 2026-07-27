# API Reference

**Base URL**: `http://localhost:4000/api/v1` (dev) | `https://api.yourdomain.com/api/v1` (prod)

**Auth**: All protected routes require `Authorization: Bearer <accessToken>` header.

**Swagger UI**: Available at `/api/docs` on the backend server.

---

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register org + first user |
| POST | `/auth/login` | — | Login, returns tokens |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/logout` | JWT | Logout |
| POST | `/auth/me` | JWT | Current user profile |
| POST | `/auth/change-password` | JWT | Change own password |
| POST | `/auth/check-email` | — | Check email availability |

### Portal Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/portal/auth/login` | Portal user login |
| POST | `/portal/auth/activate` | Activate portal account |
| POST | `/portal/auth/refresh` | Refresh portal token |
| POST | `/portal/auth/forgot-password` | Password reset request |
| POST | `/portal/auth/reset-password` | Reset with token |
| GET | `/portal/auth/password-policy` | Org password requirements |

---

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List org users |
| POST | `/users` | Create user |
| GET | `/users/me/permissions` | My resolved permissions |
| GET | `/users/me/profile` | My profile |
| PATCH | `/users/me` | Update my profile |
| GET | `/users/:id` | Get user |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Soft delete |
| DELETE | `/users/:id/permanent` | Hard delete (ADMIN+) |
| PATCH | `/users/:id/suspend` | Suspend (SUPER_ADMIN) |
| PATCH | `/users/:id/unsuspend` | Unsuspend |
| PATCH | `/users/:id/lock` | Lock account |
| PATCH | `/users/:id/unlock` | Unlock account |
| POST | `/users/:id/reset-password` | Force password reset |
| GET | `/users/:id/permissions` | Get permission summary |
| POST | `/users/:id/permission-overrides` | Set override (SUPER_ADMIN) |
| DELETE | `/users/permission-overrides/:id` | Remove override |

---

## Organizations & Departments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations/me` | Current org |
| PATCH | `/organizations/me` | Update org (ADMIN+) |
| GET | `/organizations/me/stats` | Org statistics |
| GET | `/departments` | List departments |
| POST | `/departments` | Create department |
| PATCH | `/departments/:id` | Update department |
| DELETE | `/departments/:id` | Delete department |
| GET | `/departments/:id/members` | List members |
| POST | `/departments/:id/members/:userId` | Add member |
| DELETE | `/departments/:id/members/:userId` | Remove member |
| PATCH | `/departments/:id/permissions` | Set permissions |
| PATCH | `/departments/:id/head` | Set head |

---

## Modules (Dynamic Tables)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules` | List modules |
| POST | `/modules` | Create module |
| GET | `/modules/:id` | Get module |
| GET | `/modules/by-slug/:slug` | Get by slug |
| PATCH | `/modules/:id` | Update module |
| DELETE | `/modules/:id` | Delete module |

## Fields

| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules/:moduleId/fields` | List fields |
| POST | `/modules/:moduleId/fields` | Create field |
| PATCH | `/modules/:moduleId/fields/:id` | Update field |
| POST | `/modules/:moduleId/fields/reorder` | Reorder fields |
| DELETE | `/modules/:moduleId/fields/:id` | Delete field |

## Field Rules

| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules/:moduleId/field-rules` | List rules |
| POST | `/modules/:moduleId/field-rules` | Create rule |
| PATCH | `/modules/:moduleId/field-rules/:id` | Update rule |
| DELETE | `/modules/:moduleId/field-rules/:id` | Delete rule |

---

## Records

| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules/:moduleId/records` | List records (paginated, filterable) |
| POST | `/modules/:moduleId/records` | Create record |
| GET | `/modules/:moduleId/records/:id` | Get record |
| PATCH | `/modules/:moduleId/records/:id` | Update record |
| DELETE | `/modules/:moduleId/records/:id` | Soft delete |
| POST | `/modules/:moduleId/records/bulk-delete` | Bulk delete |
| POST | `/modules/:moduleId/records/bulk-update` | Bulk field update |
| GET | `/modules/:moduleId/records/export/csv` | Export CSV |
| GET | `/modules/:moduleId/records/import/template` | Download import template |
| POST | `/modules/:moduleId/records/import/preview` | Preview CSV import |
| POST | `/modules/:moduleId/records/import/run` | Execute import |
| POST | `/modules/:moduleId/records/:id/comments` | Add comment |
| GET | `/modules/:moduleId/records/:id/activity` | Activity log |
| POST | `/modules/:moduleId/records/:id/duplicate` | Duplicate record |
| PATCH | `/modules/:moduleId/records/:id/archive` | Toggle archive |
| PATCH | `/modules/:moduleId/records/:id/lock` | Toggle lock |
| GET | `/records/lookup` | Search for lookup field values |

---

## Views

| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules/:moduleId/views` | List views |
| POST | `/modules/:moduleId/views` | Create view |
| GET | `/modules/:moduleId/views/:id` | Get view |
| PATCH | `/modules/:moduleId/views/:id` | Update view |
| DELETE | `/modules/:moduleId/views/:id` | Delete view |
| PATCH | `/modules/:moduleId/views/:id/toggle-pin` | Toggle pin |

---

## Analytics & Dashboards

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analytics/data/:moduleId` | Get aggregated data |
| POST | `/analytics/kanban/:moduleId` | Kanban board data |
| GET | `/analytics/views/list` | Saved analytics views |
| POST | `/analytics/views` | Create saved view |
| PATCH | `/analytics/views/:id` | Update saved view |
| DELETE | `/analytics/views/:id` | Delete saved view |
| GET | `/analytics/saved-filters` | Saved filters |
| POST | `/analytics/saved-filters` | Create filter |
| GET | `/analytics/targets/list` | Analytics targets |
| POST | `/analytics/targets` | Create target |
| POST | `/analytics/targets/:id/compute` | Compute target |
| GET | `/pivot/:moduleId/data` | Pivot table data |
| GET | `/dashboards` | List dashboards |
| POST | `/dashboards` | Create dashboard |
| PATCH | `/dashboards/:id` | Update dashboard |
| DELETE | `/dashboards/:id` | Delete dashboard |
| GET | `/reports` | Saved reports |
| POST | `/reports` | Create report |
| PATCH | `/reports/:id` | Update report |

---

## Forms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/forms` | JWT | List forms |
| POST | `/forms` | JWT | Create form |
| GET | `/forms/:id` | JWT | Get form |
| PATCH | `/forms/:id` | JWT | Update form |
| DELETE | `/forms/:id` | JWT | Delete form |
| POST | `/forms/:id/sections` | JWT | Add section |
| POST | `/forms/:id/fields` | JWT | Add field |
| POST | `/forms/:id/fields/reorder` | JWT | Reorder fields |
| POST | `/forms/:id/generate-token` | JWT | Generate public link token |
| GET | `/forms/:id/submissions` | JWT | List submissions |
| GET | `/public/forms/:token` | — | Get public form |
| POST | `/public/forms/:token/submit` | — | Submit form |
| POST | `/public/forms/:token/extract-document` | — | OCR document extraction |

---

## Workflows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workflows` | List workflows |
| POST | `/workflows` | Create workflow |
| PATCH | `/workflows/:id` | Update workflow |
| PATCH | `/workflows/:id/toggle` | Enable/disable |
| GET | `/workflows/:id/executions` | Execution history |
| POST | `/workflows/:id/execute-on-record` | Test on record |

---

## Blueprints (Stage Workflows)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/blueprints` | List blueprints |
| POST | `/blueprints` | Create blueprint |
| GET | `/blueprints/for-record/:recordId` | Available transitions |
| POST | `/blueprints/execute-transition` | Execute transition |
| GET | `/blueprints/my-pending-tasks` | My pending tasks |
| POST | `/blueprints/pending-tasks/:id/action` | Approve/reject |

---

## Notifications & Messaging

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List notifications |
| GET | `/notifications/unread-count` | Unread count |
| PATCH | `/notifications/read-all` | Mark all read |
| GET | `/messages/conversations` | Conversations |
| POST | `/messages/conversations/direct` | Start DM |
| GET | `/messages/conversations/:id/messages` | Get messages |
| POST | `/messages/conversations/:id/messages` | Send message |

---

## Files & Gallery

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/files/upload` | JWT | Upload file |
| GET | `/files/serve/:orgId/:filename` | — | Serve file |
| GET | `/files/record/:recordId` | JWT | Files for record |
| GET | `/gallery` | JWT | Gallery list |
| POST | `/gallery/upload` | JWT | Upload to gallery |
| GET | `/gallery/serve/:orgId/:filename` | — | Serve gallery image |

---

## Global Lists

| Method | Path | Description |
|--------|------|-------------|
| GET | `/global-lists` | List all lists |
| POST | `/global-lists` | Create list |
| GET | `/global-lists/:id/items` | Get items |
| POST | `/global-lists/:id/items` | Add item |
| GET | `/global-lists/:id/tree` | Tree view |
| GET | `/global-lists/:id/by-parent/:parentItemId` | Filtered by parent |

---

## Email

| Method | Path | Description |
|--------|------|-------------|
| POST | `/emails/send` | Send email |
| GET | `/emails` | Email log |
| GET | `/email-templates` | List templates |
| POST | `/email-templates` | Create template |
| PATCH | `/email-templates/:id` | Update template |

---

## Request Engine

| Method | Path | Description |
|--------|------|-------------|
| GET | `/requests` | List requests |
| POST | `/requests` | Create request |
| GET | `/requests/queue` | My queue |
| POST | `/requests/:id/actions` | Execute action |
| GET | `/request-types` | List request types |
| GET | `/request-blueprints` | List blueprints |

---

## Workspace

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspace/summary` | Dashboard summary |
| GET | `/workspace/tasks` | List tasks |
| POST | `/workspace/tasks` | Create task |
| PATCH | `/workspace/tasks/:id` | Update task |
| GET | `/workspace/notes` | List notes |
| POST | `/workspace/notes` | Create note |

---

## Common Query Parameters

| Param | Usage |
|-------|-------|
| `page`, `limit` | Pagination |
| `search` | Text search |
| `filters` | JSON array of filter conditions |
| `sortBy`, `sortDir` | Sorting |
| `moduleId` | Scope to module |
