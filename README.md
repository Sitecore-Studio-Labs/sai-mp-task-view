# Jira Task Management Extension

A Next.js app that connects to Jira via OAuth and lists projects. Built for use as a marketplace extension (e.g. Sitecore) with optional Supabase storage for tokens.

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
