# Sandbox workflow — testing before production

This project has two production services:

- **Frontend** — Next.js app in `mycrm/`, hosted on **Vercel** (project `mycrm`, linked via `mycrm/.vercel/project.json`), live at `mycrm-teal.vercel.app`.
- **Backend** — NestJS API in `backend/`, hosted on **Railway** (single `production` environment), live at `backend-production-9fcfe.up.railway.app`.

**Important correction:** neither service currently auto-deploys from a GitHub push. Both were, at some point, deployed via direct CLI upload rather than a connected GitHub integration, so `git push origin main` alone does **nothing** to either live site. This turns out to match the desired workflow below — nothing goes live until it's explicitly published — so it's left this way on purpose, not "fixed" to auto-deploy.

## Everyday work — no special phrasing needed

Just describe the change you want. Claude works against:
- Local frontend: `cd mycrm && npm run dev` → `localhost:3000` (not `127.0.0.1` — a dev-origin guard blocks it)
- Local backend: `cd backend && npm run start:dev` → `localhost:4000`
- Local MySQL — completely separate from the production TiDB Cloud database

Nothing here can reach production. The default rule is: **never push or deploy without being explicitly asked.**

## If a change touches the database

Say once, whenever it's relevant:
> "Only add new things, don't touch or drop anything existing — check with me first if it needs anything destructive."

In practice this means: new nullable columns and new tables are fine and applied automatically as part of publishing; anything that would drop/rename/alter a column or table holding real data gets flagged and confirmed before it touches production, never applied silently.

Config built through the app's own admin UI (modules, forms, dashboards, blueprints, field setups) lives in the database, not in git — so it's automatically sandboxed too. It won't ride along with a code deploy. If you build something locally you want live, say so separately and it'll get recreated in production (or scripted over, for anything complex).

## Checking what's pending vs. what's live

Two git tags track the exact commit currently deployed on each service: `live-backend` and `live-frontend`. They only move when a real publish happens — never on a plain `git push`. This answers "what needs to be pushed" without guessing:

```
git status                                                # uncommitted local edits, not yet even committed
git log live-backend..HEAD  --oneline -- backend/         # committed backend changes not yet deployed
git log live-frontend..HEAD --oneline -- mycrm/           # committed frontend changes not yet deployed
```

Empty output from the last two means that side is fully live — no pending changes. Before publishing, this diff is exactly what gets summarized as "here's what's about to go live."

## Publishing — the explicit trigger

Say one of:
> "Push this live" / "Publish to production" / "Make it live on mycrm-teal.vercel.app"

That triggers, in order:
1. Review of what changed, including a plain-language summary of any database migration (additive vs. not).
2. Apply the migration to the production database — only after that review.
3. `git push origin main` (for history/traceability — does not itself deploy anything).
4. Backend deploy: `cd backend && railway up -y -c` (direct upload+build+deploy to Railway; bypasses the disconnected GitHub integration). Then `git tag -f live-backend HEAD && git push origin live-backend --force`.
5. Frontend deploy: `cd mycrm && vercel --prod --yes` (direct deploy to Vercel; aliases `mycrm-teal.vercel.app` automatically). Then `git tag -f live-frontend HEAD && git push origin live-frontend --force`.
6. Live verification — hitting real routes/pages afterward, not just trusting a successful build.

## If you want auto-deploy from GitHub instead

This is possible (`railway service source connect --repo ... --branch main` for the backend; enabling the Vercel Git integration for the frontend) but is **not recommended** given the workflow above — auto-deploy means every push goes live immediately, which removes the sandbox-then-publish control this project is built around. Only ask for this if you specifically want every merge to `main` to go live with no separate publish step.

## If you ever want a "real" staging backend

Railway supports duplicating the `production` environment into a `staging` one with its own database and public URL. It roughly doubles Railway usage/cost, so it's left out by default — ask if you want it provisioned.
