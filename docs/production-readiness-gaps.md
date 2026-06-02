# Production Readiness Gaps

> **Purpose:** Tracked checklist before marking the monorepo production-ready as a multi-platform task-management platform.  
> **Last updated:** 2026-05-29  
> **How to use:** Work tasks in order. Update status when starting (`in_progress`) and finishing (`completed` or `deferred`).

**Status legend:** `pending` | `in_progress` | `completed` | `deferred`

---

## P0 — Must fix (Jira ship + CI green)

| ID    | Task                                                                                           | Status    | Notes                                                                       |
| ----- | ---------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| P0-01 | Verify CI `audit-capabilities` only lists existing apps (`jira`, not `wrike`)                  | completed | Already `--projects=jira` in testing-pipeline.yaml                          |
| P0-02 | Remove non-existent `apps/wrike` from ESLint Next/import resolver config                       | completed | `eslint.config.mjs` — jira-only `rootDir` and tsconfig project              |
| P0-03 | Parameterize `AdfRenderer` attachment URLs via `PlatformApiPaths` (not hardcoded `/api/jira/`) | completed | Uses `usePlatformApiPaths().paths.attachment`; skips media when path absent |
| P0-04 | Parameterize `ProjectSiteCard` site/project labels via `usePlatformCapabilities()`             | completed | `platformDisplayName` for placeholder and aria-label                        |
| P0-05 | Replace Jira-specific test IDs in `SiteMappingRow` with platform-neutral IDs                   | completed | `site-mapping-${platformName}-site/project-*`                               |
| P0-06 | Generalize `formatSiteSubtext` (remove Atlassian-only hostname logic)                          | completed | Shows hostname from site URL; falls back to name                            |
| P0-07 | Fix `auth-jira-status.spec.ts` to mock `authStrategy.status` (match real route)                | completed | 3 tests; removed stale hasUserJiraConnection / cookie-clear cases           |
| P0-08 | Fix corrupted API YAML example in `monorepo-overview.md`                                       | completed | Removed `setup typessetup types` typo                                       |
| P0-09 | Mark `observability-todo.md` as superseded; point to `libs/observability`                      | completed | Header updated with superseded status + README pointer                      |
| P0-10 | Strengthen `check-shadows.js` to report valid shadows and fail on true orphans                 | completed | Lists 4 jira overrides; fails if lib counterpart missing at indexed subpath |

---

## P1 — Multi-platform readiness (deferred until second app scaffolded)

| ID    | Task                                                                                   | Status    | Notes                                    |
| ----- | -------------------------------------------------------------------------------------- | --------- | ---------------------------------------- |
| P1-01 | Scaffold `apps/wrike` via platform generator + implement adapter                       | deferred  | Generator improvements done; needs OAuth |
| P1-02 | Add Wrike contract test; wire CI `--projects=jira,wrike` when app exists               | deferred  | Blocked by P1-01                         |
| P1-03 | Promote `hasSites` to `providerFlags` for UI gating                                    | deferred  | Capability system change                 |
| P1-04 | Require explicit `SupabaseTokenStoreConfig` in generator (no silent `jira_*` defaults) | completed | `storeConfig.ts` generated per platform  |
| P1-05 | Add `extractPlatformError.ts` template to platform generator                           | deferred  | Generator change                         |
| P1-06 | Sync generator `platformRoute` template with Jira observability wiring                 | deferred  | `hasDynamicHost` errors added; OTel TBD  |
| P1-07 | Add `TaskFormHeader` shadow to generator or fix docs                                   | completed | Step 3 directory listing updated         |
| P1-08 | Refactor setup API routes to use shared `withAdapter` error handling                   | deferred  | `apps/jira/src/app/api/setup/*`          |
| P1-09 | Add `validate-http-adapter` CI target to every platform app                            | completed | `tools/validate-http-adapter.js`         |
| P1-10 | Generator: generate `<Platform>SetupService.ts` from setup YAML block                  | completed | `genSetupService()` added                |
| P1-11 | Generator: generate host validator + repair when `hasDynamicHost: true`                | completed | `genHostValidator()` + `genRepair*()`    |
| P1-12 | Update SettingsPanel template to use `PlatformSetupScopePicker`                        | completed | Template updated; `scopeLabel` derived   |

---

## P2 — Release verification (manual / ops)

| ID    | Task                                                         | Status  | Notes                                        |
| ----- | ------------------------------------------------------------ | ------- | -------------------------------------------- |
| P2-01 | Manual QA: connect / disconnect / missing cookie flows       | pending | See prior QA guide in chat / security matrix |
| P2-02 | Confirm Vercel env vars + Supabase migrations for production | pending | Ops                                          |
| P2-03 | Run full E2E on release branch before merge to `main`        | pending | CI affected-scoped                           |

---

## Completion summary

| Phase | Total | Completed | Deferred | Pending |
| ----- | ----- | --------- | -------- | ------- |
| P0    | 10    | 10        | 0        | 0       |
| P1    | 8     | 0         | 8        | 0       |
| P2    | 3     | 0         | 0        | 3       |

**Production-ready criteria (this doc):**

- **Jira-only release:** All **P0** complete ✅ — proceed after **P2** manual verification.
- **Multi-platform platform release:** Complete **P1** (at minimum P1-01 + P1-02) in addition to P0 and P2.

---

## Resume here if interrupted

All executable **P0** code tasks are done. Next actions:

1. **P2-01** — Manual auth/connect QA
2. **P2-02** — Production env + DB checklist
3. **P2-03** — E2E on release PR
4. When ready for second platform — start **P1-01** (scaffold Wrike)
