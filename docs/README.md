# CRM/ERP Platform — Documentation

A metadata-driven, multi-tenant enterprise CRM/ERP system built with **Next.js 16** (frontend) and **NestJS** (backend).

---

## Documentation Index

### Getting Started
| Document | Description |
|----------|-------------|
| [Installation](Installation.md) | Local development setup |
| [Configuration](Configuration.md) | Environment variables reference |
| [Deployment](Deployment.md) | Production deployment steps |
| [Hosting-Guide](Hosting-Guide.md) | Railway, Netlify, VPS options |

### Architecture & Design
| Document | Description |
|----------|-------------|
| [Architecture](Architecture.md) | System overview, tech stack, design patterns |
| [Project-Structure](Project-Structure.md) | Directory layout, file conventions |
| [Database](Database.md) | Schema, models, migrations |
| [Authentication](Authentication.md) | JWT auth, portal auth, sessions |
| [Permissions](Permissions.md) | Role-based and field-level access control |
| [Security](Security.md) | Security model, CORS, rate limiting |

### Features & Modules
| Document | Description |
|----------|-------------|
| [Modules](Modules.md) | Dynamic module (table) system |
| [Form-Builder](Form-Builder.md) | Public forms, OCR, submission receipts |
| [Workflow](Workflow.md) | Automation engine, triggers, actions |
| [Reporting](Reporting.md) | Analytics, dashboards, saved reports |
| [Pivot-Table](Pivot-Table.md) | Cross-tab analysis |
| [OCR](OCR.md) | Document extraction via Anthropic Claude |
| [File-Storage](File-Storage.md) | File upload, serving, gallery |

### Operations
| Document | Description |
|----------|-------------|
| [API](API.md) | Full REST API reference |
| [Backup-Recovery](Backup-Recovery.md) | Backup strategies, restore procedures |
| [Troubleshooting](Troubleshooting.md) | Common issues and fixes |
| [FAQ](FAQ.md) | Frequently asked questions |

### Project
| Document | Description |
|----------|-------------|
| [Changelog](Changelog.md) | Version history |
| [Future-Roadmap](Future-Roadmap.md) | Planned features |

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo> crm && cd crm
cd backend && npm install
cd ../mycrm && npm install

# 2. Configure
cp backend/.env.example backend/.env   # edit DATABASE_URL, JWT_SECRET, etc.
cp mycrm/.env.local.example mycrm/.env.local

# 3. Database
cd backend
npx prisma migrate deploy
npx prisma generate

# 4. Run (two terminals)
cd backend && npm run start:dev
cd mycrm   && npm run dev
```

Open http://localhost:3000 — create your organization on first launch.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Backend | NestJS 10, TypeScript |
| Database | MySQL 8 via Prisma ORM |
| Auth | JWT (24h access / 7d refresh), bcryptjs |
| State | Zustand (13 stores) |
| Drag-drop | @dnd-kit/core, @dnd-kit/sortable |
| Charts | Recharts |
| Tables | @tanstack/react-table |
| Real-time | Socket.io (WebSocket) |
| Queue | BullMQ + Redis |
| AI/OCR | Anthropic Claude API (claude-sonnet-4-6) |
| Email | Nodemailer (custom SMTP) |
| Calendar | Google Calendar OAuth2 |
| Storage | Local disk (`backend/uploads/`) |
| Deployment | Railway (backend), Netlify (frontend) |
