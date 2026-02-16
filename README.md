# Task Management Marketplace Extension (Jira Integration)

Task Management Marketplace Extension is a Next.js + TypeScript application built as a Sitecore AI Page Builder Context Panel extension. It enables users to connect to Jira Cloud, view and manage Jira tasks directly within the Marketplace app, and perform core task operations — all without leaving the Sitecore context.

This project is designed with scalability in mind, using modern patterns including:

- Adapter pattern for platform extensibility
- Axios with interceptors to handle automatic OAuth token refresh
- TanStack Query (React Query) for data fetching and caching
- Supabase for persistent storage of Jira connection metadata
- Next.js API routes for secure server-side integrations

## Tech stack

- **Next.js** (App Router), **TypeScript**
- **TanStack Query** for data fetching
- **Axios** with interceptors for auth and token refresh
- **Supabase** for storing encrypted Jira tokens (optional)

## Project setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `JIRA_CLIENT_ID` | Atlassian OAuth app client ID |
| `JIRA_CLIENT_SECRET` | Atlassian OAuth app client secret |
| `JIRA_REDIRECT_URI` | Callback URL (e.g. `http://localhost:3000/api/auth/jira/callback`) |
| `NEXT_PUBLIC_APP_URL` | App URL when embedded (e.g. `http://localhost:3000`) |

Create a Jira OAuth 2.0 (3LO) app in the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and add the same callback URL under Authorization.

### 3. Supabase database

In the [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**, run the contents of `supabase/schema.sql` to create the `jira_connections` and `sync_logs` tables.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Jira extension UI is at [http://localhost:3000/task-manager-extension](http://localhost:3000/task-manager-extension).

## Scripts

- `npm run dev` – start development server
- `npm run build` – build for production
- `npm run start` – start production server
- `npm run lint` – run ESLint

## Commits

This project uses [Husky](https://typicode.github.io/husky/) and [Commitlint](https://commitlint.js.org/) to enforce [Conventional Commits](https://www.conventionalcommits.org/):

- **Pre-commit:** runs `lint-staged` (ESLint on staged `.js`, `.jsx`, `.ts`, `.tsx` files).
- **Commit-msg:** validates the commit message format.

Example: `feat: add Jira connect button`, `fix: resolve callback redirect`, `chore: update deps`.
