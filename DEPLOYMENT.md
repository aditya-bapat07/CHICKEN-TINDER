# Publish Chicken Tinder on Vercel

The repository is configured for a single Vercel project with a static React frontend and a Node 24 API function. PostgreSQL stores accounts, activities, matches, sessions, and shared rate limits. No Redis service is required.

## Current production website

Published September 25, 2026: **https://v0-chicken-tinder.vercel.app**. The `chicken-tinder` Vercel project is connected to a dedicated Neon database on its free plan, with all 185 catalog activities initialized. Production database variables are already configured; no setup is needed to use this website. The original SQLite file remains on disk and its accounts/history have not been imported.

The steps below describe setup for a new project or separate preview environment. A separate preview database has not been provisioned for this project. The published production site uses its dedicated production database.

## 1. Create a PostgreSQL database

Create a database with your preferred hosted PostgreSQL provider. Keep it near your Vercel function region. Obtain:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Provider's pooled PostgreSQL connection URL for runtime requests. Use TLS and a small Prisma connection limit, such as `connection_limit=5&pool_timeout=10`. Preserve provider-required parameters. |
| `DIRECT_URL` | Provider's direct connection URL, or a session-pooler connection that supports migrations. Use TLS. Do not use a transaction-pooler URL for migration commands. |

For an unpooled database the two URLs can point to the same database. Both must target the same database/schema. The app uses Prisma 6; follow your provider's Prisma 6 connection instructions, including `pgbouncer=true` if required. Never prefix these secrets with `VITE_` or put them in frontend files.

Keep preview and production databases separate. Do not give preview deployments production credentials. This guide creates a new database; it does not copy accounts or history out of the old SQLite file.

## 2. Database initialization is automatic

The Vercel build runs `npm run vercel:build`: it checks both database URLs, compiles the app, applies the committed PostgreSQL migrations, and seeds all 185 catalog activities. No manual migration or seed command is required for a fresh deployment. Any failed step stops the deployment.

Seeding uses stable keys and is safe to repeat; it preserves existing IDs, matches, and swipes. Build environments must each use their own intended database. Preview builds must never receive production database credentials. Future production migrations should remain backward-compatible with the currently running app until deployment completes.

For local maintenance, `npm run db:deploy` and `npm run db:seed` remain available. Do not use `db:push`, `migrate dev`, or reset commands against production.

## 3. Import the repository in Vercel

Commit the source changes and push to your Git repository. The local SQLite archive is ignored and must stay out of commits. In Vercel, import that repository with:

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (leave blank); **not** `frontend` or `backend` |
| Framework Preset | Other |
| Node.js | 24.x |
| Install Command | `npm ci --include=dev && npm --prefix frontend ci --include=dev` |
| Build Command | `npm run vercel:build` |
| Output Directory | `frontend/dist` |

These settings are also committed in `vercel.json`. Add `DATABASE_URL` and `DIRECT_URL` in Vercel's environment-variable settings for each target environment before deployment. Do not add `TEST_DATABASE_URL` to Vercel.

`NODEJS_HELPERS=0` is configured for build and runtime in `vercel.json`, so Fastify receives the original Node request/response stream. Keep this value if overriding it in the dashboard.

`NODE_OPTIONS=--experimental-require-module` is also configured for build and runtime. Fastify's static-file dependency loads an ES module from CommonJS; Vercel disables that Node feature by default. Keep this setting to prevent an API startup failure. See [Vercel's module-loading configuration](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module).

The function is `api/index.js`, with a cached Fastify instance and Prisma client. It does not open a server listener. Static files take precedence; remaining requests are rewritten to the function while preserving the request path. Fastify handles `/api/*`, legacy API paths, `/docs`, and browser deep links. The bundle explicitly includes compiled backend code, frontend assets needed for deep links, and the generated Prisma client. Do not set `VITE_API_URL`; the frontend uses the same origin.

## 4. Verify a preview, then launch

Deploy a preview using the preview database. Verify:

1. `/api/health` returns `{"status":"online","database":"connected"}`. `/health` is only a process check.
2. `/api/activities` returns the seeded catalog.
3. Signup opens the quiz; password sign-in, profile updates, swiping, sharing, and sign-out work.
4. Reload `/activities`, `/matches`, `/keys`, and an `/invite/:token` link directly. An unknown `/api/*` path must return JSON 404, not the frontend HTML.
5. Data remains available across requests and redeploys. Inspect function logs for errors.

For a read-only automated check, run `npm run smoke -- https://your-project.vercel.app` (the URL must be publicly accessible).

After the preview checks pass, deploy the main branch with the production database variables and repeat the smoke checks. Vercel provides HTTPS. A database backup/restore policy and monitoring should be enabled with your chosen provider.

## Launch verification

The September 25, 2026 production release passed a real Vercel Linux build and public smoke checks for database readiness, catalog data, deep links, authentication, and API 404s. A live Chrome test verified signup, quiz, swiping, saved matches after reload, public invitations, logout/login, and mobile layout. Its synthetic account was removed afterward. Local checks passed 101 API checks, concurrency/security regressions, five browser tests, five deployment-environment tests, and dependency audits with zero findings.

## Local checks

For local development use the PostgreSQL Docker service:

```sh
cp .env.example .env
docker compose up -d --wait
npm ci
npm run setup
npm run dev
```

Before publishing:

```sh
npm run build
npm test
npm run test:e2e
npm audit --audit-level=moderate
npm --prefix frontend audit --audit-level=moderate
```

Tests require `TEST_DATABASE_URL` pointing at a disposable PostgreSQL database with permission to create/drop schemas. Each run uses a generated schema and drops only that schema. It applies actual migrations and verifies that seeding twice preserves the catalog. It never defaults to the production `DATABASE_URL`. Browser tests use installed Chrome locally and Playwright Chromium in GitHub Actions.

## Security behavior and remaining product limits

- Password signup/sign-in credentials expire after seven days. Signing out revokes the current browser session. Password changes revoke other browser sessions, retaining the current credential. Personal API keys are separately revocable and do not automatically expire; their labels do not control session behavior.
- Credential attempts share a PostgreSQL-backed limit across API aliases and instances: 20 per IP per 15 minutes. Password changes allow 10 attempts per user per 15 minutes, new personal keys 20 per user per day, and new activities 10 per user per hour. Expired rate-limit rows are cleaned in bounded batches. The app trusts Vercel's client-IP header only inside the Vercel runtime.
- API responses use `Cache-Control: no-store`. Responses include security headers; unexpected errors return generic messages. Credentials remain in browser local storage, so preventing XSS remains important. A strict content security policy and cookie-based browser authentication are possible future improvements.
- Email verification and password-reset email delivery are not implemented. Personal-key sign-in remains available. Public activity contributions are rate limited but not moderated; add moderation if opening to a large audience.
- Catalog/history endpoints are suitable for the current small catalog; pagination and broader load testing are future scaling work.
- The old SQLite file is preserved locally and is now ignored/untracked. Existing Git history still contains it; if it held real credentials in a shared repository, review exposure and rotate affected credentials. No history rewrite or data deletion was performed.
- `deepmerge-ts` is overridden to version 8 to resolve the advisory in Prisma 6's build tooling. Migration/build tests pass with this override. Revisit the override when upgrading Prisma itself.

References: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [rewrites](https://vercel.com/docs/routing/rewrites), [disabling Node helpers](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration), and [Prisma 6 database connections](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections).
