# AGENTS.md

## Purpose
This file defines the working rules for coding agents in the Selino backend.

## Project Snapshot
- Framework: NestJS 11 + TypeScript
- Runtime: Node.js (latest)
- Database: PostgreSQL + Drizzle ORM
- Testing: Jest (`unit`, `e2e`, `coverage`)
- Lint/format: ESLint + Prettier

## Core Workflow
1. Keep changes scoped to the requested task; avoid unrelated refactors.
2. Follow existing NestJS module/service/controller patterns.
3. Run validation commands after code changes:
   - `npm run lint`
   - `npm run test` (or targeted tests when appropriate)
   - `npm run build` (mandatory final syntax/build check)

## Code Standards
- Use TypeScript and preserve strict typing where practical.
- Follow existing file naming and structure (`*.module.ts`, `*.service.ts`, `*.controller.ts`, `dto/`, `index.ts` barrels).
- Use ESM-style internal imports with `.js` extensions (project uses `moduleResolution: nodenext`).
- Prefer clear, typed DTOs and request/response contracts.
- Keep Swagger decorators aligned with controller behavior.
- Reuse shared helpers/constants instead of duplicating logic.

## Database and Migrations (Drizzle)
- Keep schema changes in `src/database/schema/`.
- Generate migrations with:
  - `npm run db:generate`
- Do **not** run `npm run db:migrate` automatically; database migration execution is manual unless explicitly requested.
- Do **not** use `db:push` for normal feature work unless explicitly requested.
- Prefer Drizzle relational query API (`db.query.<table>.findFirst/findMany`) when it can express the query cleanly.
- Fall back to query builder/SQL expressions only when relational query API is insufficient.
- For multi-step writes, use transactions.

## Authorization and Security
- Respect existing auth stack (`JwtAuthGuard`, `UserEnrichmentGuard`, CASL policies).
- When adding protected endpoints, wire guards/policies consistently.
- Prefer least-privilege checks and explicit `Unauthorized`/`Forbidden` behavior.

## Testing Expectations
- Add or update tests for behavior changes.
- Keep tests close to affected modules when possible.
- Ensure new behavior is covered for both success and failure paths.

## Useful Commands
- `npm run start:dev` - run in watch mode
- `npm run build` - production build (required verification step)
- `npm run lint` - lint and auto-fix
- `npm run test` - unit tests
- `npm run test:e2e` - end-to-end tests
- `npm run test:cov` - coverage report
