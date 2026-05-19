# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-19

First production release of the SitecoreAI Jira Task Manager marketplace extension.

### Added

- Initial project setup with Next.js, Supabase, and Jira OAuth 2.0 connection with secure token management (#1)
- UI theme setup with design tokens and component library (#2)
- Jira issue fetching with cursor-based pagination using `useInfiniteQuery` (#3)
- API routes for assignees, issue types, priorities, and task creation (#4)
- Task list UI with infinite scroll (#8)
- Task detail view with fetching and display (#6, #11)
- Issue filtering implementation (#14)
- Custom ADF (Atlassian Document Format) renderer for task descriptions and comments (#15)
- Jira task delete module — backend API (#10)
- API endpoints for fetching all issue statuses and types per project (#17)
- Task list filters — status and type filtering (#14, part 1)
- Task delete UI with confirmation dialog (#18)
- Comment module — backend API for adding comments (#13)
- Comment UI — inline comment composition and submission (#21)
- User delete permissions with role-based access control (#20)
- Attachment GET route with dynamic `attachmentId` (#23)
- Context panel task creation with AI-powered work breakdown via OpenAI (#16)
- Backend API for Jira issue editing (#7)
- Jira webhook registration and Supabase Realtime UI sync (#24)
- Issue status update — backend transition API (#25)
- Issue status update — UI with status badge dropdown (#35)
- Jira task edit UI with inline field editing (#33)
- Image rendering in task descriptions (#30)
- Assignee and priority filters in task list (#27)
- Jira site selection and multi-site connection management (#36)
- Project-specific Jira priorities retrieval and UI integration (#39)
- Permission checks for issue actions (create, edit, delete, transition) with refactored permission handling (#43)
- Project selection and update functionality in Jira integration (#49)
- Settings panel with site and project defaults (#86, #102)
- Setup wizard API endpoints, hooks, and in-flow UI (#97, #99, #101)
- Website mappings in settings panel (#114)
- ProjectSiteCard component for site/project context (#119)
- Page context hook integrated with task creation provider (#84, #100)
- ConnectionsList refactored into ConnectionScreen (#85)
- Row-level security (RLS) policies for Jira Supabase tables (#115)
- Snyk and Gitleaks security scanning pipelines with local hooks (#56)
- Documentation: source code and secrets handling, versioning process (#54)
- Documentation: third-party and OSS security (#62)
- Documentation: data inventory, DPA, DSAR, and encryption compliance (#54)

### Changed

- Extended `TaskManagerProvider` to expose tasks and filters for downstream consumers (#29)
- Refined `AsyncStateCards` UI for loading, error, and empty states (#34)
- Enhanced permission handling and loading state in task manager (#46)
- Replaced hard-coded demo user ID with Jira account ID of the logged-in user (#26)
- Replaced user ID cookie with secure session-based authentication (#47)
- Integrated cloud ID handling across Jira API routes and components
- Renamed site label in connection UI (#66)
- Removed Dependabot configuration (#121)
- Removed unused connection and project picker components (#124)
- Removed `SYSTEMS` constant (#120)

### Fixed

- Type error in axios config interceptor
- Hydration error and double toast on initial load (#5)
- Missing import causing build failure (#9)
- Connection toast incorrectly showing when not connected (#12)
- Subtasks now included in issue details view (#38)
- Dropdown indicator added to status badge when clickable; task title limited to two lines in listing (#51)
- User ID now retrieved from session instead of cookies for Jira connection (#52)
- Auto-selection of Jira site when only one site is available (#122)
- npm audit vulnerabilities remediated (#65)

### Refactored

- Jira connection issue handling and error recovery (#32)
- Simplified error handling in Jira permissions route (#57)
- Optimized GitHub Actions testing pipeline (#61)

### Security

- Added security controls evidence document — input validation, tenant isolation, error handling, business logic (#57)
- Fixed package.json security issues — dependency updates and vulnerability remediation (#55)
- Added authentication compliance documentation and negative auth tests (#58)
- Added AI integration security evidence and governance policy documents (#59)
- Added security testing and vulnerability management documentation (#60)
- Added `npm audit --audit-level=high` CI gate for dependency vulnerability scanning
- Added license compliance check in CI with allowed-license policy
- Added CycloneDX SBOM generation per PR with 90-day artifact retention
- Documented vulnerability response SLA by severity level
- Moved `supertest` and `@vitejs/plugin-react` from production to dev dependencies

### CI & Testing

- Added ESLint rules and Prettier plugins for formatting consistency (#28)
- Configured Vitest testing environment with jsdom and path aliases (#37)
- Implemented GitHub Actions testing pipeline — lint, format check, unit tests, coverage, build, E2E (#42)
- Added unit tests for core services and utilities (#44)
- Added integration tests for API routes (#48)
- Added E2E tests for Jira connect flow (#40)
- Added E2E tests for Jira disconnect flow (#41)
- Added E2E tests for additional flows (#50)

[1.0.0]: https://github.com/Sitecore-Studio-Labs/sai-mp-jira-task-view/releases/tag/v1.0.0
