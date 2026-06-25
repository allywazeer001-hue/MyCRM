# CRM Change Log — Production System

> Rule: Every change is reversible. Snapshots stored in `/snapshots/`.
> Rollback: Copy snapshot file back to original path and rebuild.

---

## CHANGE_001 — Kanban Drag & Drop Fix
**Date:** 2026-05-29
**Files Modified:** `mycrm/app/(dashboard)/m/[slug]/page.tsx`
**Snapshot (before):** `snapshots/CHANGE_001_before_kanban.txt` (lines 416–554)

### Problem
- Kanban cards could not be dragged because `setActivatorNodeRef` was missing from the grip handle
- After a successful drag, clicking the card navigated to the record detail page (click-after-drag bug)

### Changes Made
1. Added `setActivatorNodeRef` destructured from `useDraggable()` → applied to grip handle `div`
2. Added `useRef(false)` (`dragHappenedRef`) to track whether a drag occurred
3. `onClick` on card checks `dragHappenedRef` before navigating — clears flag and returns if drag just happened

### Rollback
```bash
# Restore snapshot lines 416-554 into page.tsx
# Or: git diff to see exact changes and revert
```

---

## CHANGE_002 — Records Service SUPER_ADMIN Cross-Org Fix
**Date:** 2026-05-29
**Files Modified:** `backend/src/records/records.service.ts`, `backend/src/records/records.controller.ts`
**Snapshot (before):** `snapshots/CHANGE_002_before_records_service.ts`

### Problem
- SUPER_ADMIN from a different org could not update records (org filter mismatch in update query)

### Changes Made
1. Records controller passes `null` orgId for SUPER_ADMIN on update/delete
2. Records service `update()` and `remove()` accept `string | null` orgId — omit from where clause if null

### Rollback
```bash
# Restore: snapshots/CHANGE_002_before_records_service.ts → backend/src/records/records.service.ts
# Rebuild: cd backend && npm run build
```

---

## CHANGE_003 — Access Control Audit (No code changes)
**Date:** 2026-05-29
**Status:** Verified — existing permission gates are functioning correctly after previous fixes

### Findings
- SUPER_ADMIN: bypasses all checks via `PermissionCheckService` + frontend store
- ADMIN: unit-scoped permissions from their department's permission JSON
- USER: department permissions with restricted defaults
- All permission gate UI components respect role hierarchy

---
