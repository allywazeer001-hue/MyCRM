# Project Structure

```
CRM/
├── backend/                    # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (90 models)
│   │   └── migrations/         # Migration history
│   ├── src/
│   │   ├── main.ts             # Bootstrap: port, CORS, pipes, swagger
│   │   ├── app.module.ts       # Root module (imports all 46+ modules)
│   │   ├── prisma/             # PrismaService (global)
│   │   ├── auth/               # JWT strategy, guards, login/register
│   │   ├── users/              # User CRUD, status management
│   │   ├── organizations/      # Org settings, stats
│   │   ├── departments/        # Department + head management
│   │   ├── modules/            # DynamicModule CRUD
│   │   ├── fields/             # Field + FieldOption CRUD
│   │   ├── field-rules/        # Conditional field rules
│   │   ├── records/            # Record CRUD, import/export, comments
│   │   ├── relationships/      # Cross-module relations
│   │   ├── views/              # Saved table/kanban/calendar views
│   │   ├── workflows/          # Automation engine
│   │   ├── blueprints/         # Stage-based approval workflows
│   │   ├── process/            # Process blueprint engine
│   │   ├── task-panels/        # Task queue panels
│   │   ├── forms/              # Form builder + public submission
│   │   ├── global-lists/       # Hierarchical dropdown lists
│   │   ├── analytics/          # Data aggregation, saved views
│   │   ├── dashboards/         # Dashboard + widget CRUD
│   │   ├── pivot/              # Pivot table data
│   │   ├── reports/            # Saved report builder
│   │   ├── permissions/        # Permission matrix
│   │   ├── notifications/      # In-app notifications
│   │   ├── messages/           # Direct messaging / group chat
│   │   ├── emails/             # Email send + log
│   │   ├── email-templates/    # HTML email templates
│   │   ├── files/              # File upload + serve
│   │   ├── gallery/            # Image gallery
│   │   ├── publications/       # Announcements / news feed
│   │   ├── portal/             # Customer portal (auth, pages, admin)
│   │   ├── workspace/          # Tasks, notes, calendar
│   │   ├── tracker/            # Performance scoring
│   │   ├── requests/           # Service request engine
│   │   ├── request-types/      # Request type definitions
│   │   ├── request-blueprints/ # Request stage blueprints
│   │   ├── record-routing/     # Virtual queues + routing rules
│   │   ├── calendar-sync/      # Google Calendar OAuth
│   │   ├── industry-setup/     # Template installer
│   │   ├── websocket/          # Socket.io gateway
│   │   ├── audit/              # Audit log queries
│   │   └── common/
│   │       └── filters/        # GlobalExceptionFilter
│   ├── uploads/                # Uploaded files (not committed)
│   ├── .env                    # Backend env variables
│   └── package.json
│
├── mycrm/                      # Next.js 16 frontend
│   ├── app/
│   │   ├── (auth)/             # Login, register pages
│   │   ├── (dashboard)/        # Authenticated app
│   │   │   ├── m/[slug]/       # Module list + record views
│   │   │   ├── forms/[id]/     # Form builder
│   │   │   ├── settings/       # Org settings, workflows, blueprints
│   │   │   ├── admin/          # Global lists, permissions
│   │   │   ├── users/          # User management
│   │   │   ├── workspace/      # Tasks, notes
│   │   │   ├── analytics/      # Charts, pivot tables
│   │   │   └── ...
│   │   ├── cf/                 # Customer-facing portal
│   │   │   ├── layout.tsx      # Portal layout
│   │   │   └── ...
│   │   └── f/[token]/          # Public form submission
│   │       └── page.tsx        # Main form page
│   ├── components/
│   │   ├── blueprints/         # Blueprint UI components
│   │   ├── forms/              # Form renderer components
│   │   ├── modules/            # Table, kanban, calendar views
│   │   ├── records/            # Record detail, comments
│   │   ├── ui/                 # shadcn/ui base components
│   │   └── ...
│   ├── store/                  # Zustand state stores (13)
│   ├── lib/                    # Utility functions, API client
│   ├── hooks/                  # Custom React hooks
│   ├── public/                 # Static assets
│   ├── next.config.ts          # Proxy rewrites, image domains
│   └── .env.local              # Frontend env variables
│
└── docs/                       # This documentation
```

---

## Naming Conventions

| Pattern | Example |
|---------|---------|
| NestJS module folder | `kebab-case/` |
| Controller | `feature.controller.ts` |
| Service | `feature.service.ts` |
| Module | `feature.module.ts` |
| Next.js page | `page.tsx` inside route folder |
| Zustand store | `feature.store.ts` |
| Shared components | `components/feature/ComponentName.tsx` |

## Environment Files

| File | Purpose |
|------|---------|
| `backend/.env` | NestJS reads this at startup |
| `mycrm/.env.local` | Next.js reads at build/runtime |

Never commit either file. See [Configuration.md](Configuration.md) for all variables.
