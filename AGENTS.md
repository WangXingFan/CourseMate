# Repository Guidelines

## Project Structure & Module Organization

- `apps/web/`: Next.js/React UI; routes in `app/`, workflows in `features/`, reusable code in `shared/`, and assets in `public/`.
- `apps/desktop/`: Tauri shell; Rust sources in `src-tauri/`.
- `backend/`: Go API. Requests flow through `internal/transport/http` → `application` → repository/port interfaces → `infra`; business rules belong in `domain`.
- `packages/core/`: platform-neutral client logic; `packages/api-contract/`: generated transport types.
- `content/signals/`: course materials; `docs/`: guides; `deploy/`: configuration and deployment resources.

## Build, Test, and Development Commands

Use Node.js 24, pnpm 10.17.0, and Go 1.26.8. Backend scripts require Make/Bash; desktop builds require Rust/Tauri prerequisites.

- `pnpm install`: install workspace dependencies.
- `pnpm dev:web` / `pnpm dev:api`: start frontend/API separately.
- `pnpm dev:desktop`: run the desktop client.
- `pnpm check`: run workspace lint, type, and architecture checks.
- `pnpm test`: run workspace tests.
- `pnpm build`: build configured workspaces.
- `pnpm verify`: run checks, tests, and builds together.
- `pnpm --filter @deeix/web check`: validate only the web workspace.

## Coding Style & Naming Conventions

Match surrounding code: TypeScript generally uses two-space indentation, double quotes, and semicolons. Use kebab-case frontend filenames, PascalCase React components, and camelCase functions. Keep routes and HTTP handlers thin.

Biome lints TypeScript; its formatter is disabled. Format Go with `gofmt` and Rust with `cargo fmt`. Read `apps/web/AGENTS.md`, `BIOME.md`, and `DESIGN.md` before frontend changes.

## Testing Guidelines

Go tests live beside code as `*_test.go`; run `go test ./...` inside `backend/`. Core uses Node's test runner with `src/**/*.test.ts`; web and desktop script tests use `scripts/*.test.mjs`.

Add focused regressions for authentication, authorization, streaming, public contracts, and changed core logic. Run relevant learning/chat script tests and manually verify UI behavior. Prioritize critical paths over exhaustive coverage.

## Commit & Pull Request Guidelines

History predominantly uses `feat:`, `fix:`, `refactor:`, and `chore:`. Follow CI's unscoped ASCII `type: subject` format, e.g. `fix: preserve quiz progress`.

Target `main` and follow `.github/pull_request_template.md`: explain the problem, approach, verification, and compatibility implications. Link relevant issues; include screenshots for UI changes or API examples for contract changes.

## Configuration & Generated Files

Use the example configurations documented in `README.md`; never commit secrets or local data. After API changes, run `pnpm api:generate` and `pnpm api:check`; commit generated Swagger and TypeScript artifacts together.

## Agent Working Principles

Develop and commit on `main` by default. Create or switch to another branch only when the user explicitly requests it.

Avoid overengineering and excessive defensive code. Preserve traceable errors. Keep verification proportional to the change; do not repeatedly audit unchanged code or repeat completed checks after context recovery.
