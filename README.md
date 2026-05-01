# MP Task Management — NX Monorepo

Multi-platform task management panel extensions for the Sitecore AI Page Builder. Built as a Next.js monorepo — shared logic lives in libraries, platform-specific code lives in apps.

The first platform integration is **Jira Cloud** (`apps/jira`). The architecture is designed so new platforms (Trello, Asana, Wrike…) can be scaffolded with a single CLI command and require only implementing a platform adapter.

## Repository layout

```text
apps/
  jira/                  Next.js app — Jira Cloud integration

libs/
  task-core/             Contexts, types, schemas, base adapter interface
  ui/                    React component library (shadcn/ui + task management UI)
  shared/                Utilities: cn(), API client, encryption, error helpers
  ai/                    AI work-breakdown (OpenAI, schemas, draft storage)

tools/
  generators/            NX workspace generator — scaffolds new platform apps
  webpack-plugins/       UiShadowResolverPlugin — component shadowing for webpack

capabilities/
  jira.yaml              Platform capability matrix (drives code generation)
  wrike.yaml
```

## Quick start

```bash
npm install
cp apps/jira/.env.example apps/jira/.env.local  # fill in your credentials
npm run dev                                       # http://localhost:3000
```

The extension iframe entry point is at `http://localhost:3000/task-manager-extension`.

## Documentation

| Document                                                        | Description                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| [Monorepo architecture](docs/architecture/monorepo-overview.md) | Three-layer design, library catalog, NX + `@mp/*` aliases    |
| [Component shadowing](docs/architecture/component-shadowing.md) | Per-app UI overrides without touching `libs/ui`              |
| [Adding a new platform app](docs/guides/new-platform-app.md)    | Capability YAML → generator → implement adapter              |
| [Contributing](docs/guides/contributing.md)                     | Branching strategy, rebase workflow, commit format, releases |

## Scripts

| Command          | What it does                           |
| ---------------- | -------------------------------------- |
| `npm run dev`    | Dev server for `apps/jira` (Turbopack) |
| `npm run build`  | Production build                       |
| `npm run lint`   | ESLint across all packages             |
| `npm run format` | Prettier across all packages           |
| `npm run test`   | Vitest unit tests                      |
| `npm run e2e`    | Playwright end-to-end tests            |

All commands are delegated to NX (`nx run jira:<target>`). To target a specific app or lib: `npx nx run <project>:<target>`.

## Commits

Conventional Commits enforced by Husky + Commitlint.
Pre-commit: ESLint + Prettier on staged files.

```
feat: add Jira connect button
fix: resolve callback redirect
chore: update deps
```
