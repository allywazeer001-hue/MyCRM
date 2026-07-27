# Sandbox workflow — testing before production

This project has two production services:

- **Frontend** — Next.js app in `mycrm/`, deployed on **Vercel** (project `mycrm`, linked via `mycrm/.vercel/project.json`).
- **Backend** — NestJS API in `backend/`, deployed on **Railway** (single `production` environment, redeploys automatically on push to `main`).

Both only deploy from the `main` branch. Nothing you do on another branch touches the live site — that's what makes the workflow below a free sandbox, with no second Railway environment or extra cost.

## Day-to-day workflow

1. **Work on a branch, not `main`.**
   ```
   git checkout -b dev          # or a short-lived feature branch off dev
   ```
2. **Test locally first**, against your local `.env` / `.env.local` — never against the production `DATABASE_URL` or Railway variables:
   ```
   cd backend && npm run start:dev     # NestJS with hot reload
   cd mycrm   && npm run dev           # Next.js with hot reload
   ```
   Use `localhost:3000` for the frontend (not `127.0.0.1` — the dev-origin guard blocks it).
3. **Push the branch to GitHub.** If the Vercel project's GitHub integration is connected (Vercel dashboard → Project → Settings → Git), every push gets its own free **preview URL** for the frontend automatically — a real, shareable staging link that never overwrites production. The Railway backend does **not** redeploy for non-`main` branches, so it stays untouched.
4. **When you're ready — on your own schedule — merge `dev` into `main`** (via a PR or a local merge + push). That merge is the only thing that triggers:
   - Vercel's production build (`mycrm-teal.vercel.app`)
   - Railway's production redeploy (backend)

## One-time check

Confirm in the Vercel dashboard that the project's **Production Branch** is set to `main` and the GitHub integration is enabled — that's what makes step 3 above give you automatic preview URLs. This can't be changed from the CLI/MCP tooling here, so it's a one-time manual check in the Vercel UI if you haven't already set it up.

## If you ever want a "real" staging backend later

Railway supports duplicating the `production` environment into a `staging` one with its own database and public URL, wired to the `dev` branch. It roughly doubles Railway usage/cost, so it's left out of this workflow by default — ask if you want it provisioned.
