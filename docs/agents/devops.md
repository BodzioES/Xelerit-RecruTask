# DevOps Guide — Docker, Compose, nginx

Read [`AGENTS.md`](../../AGENTS.md) first. This guide covers infrastructure and runtime.

## 1. Topology

One Compose project (`moveit`) with three services and one target-only job:

| Service | Image | Host port | Purpose |
| --- | --- | --- | --- |
| `db` | `postgres:17-alpine` | 5433 → 5432 | persistent PostgreSQL |
| `migrate` (target) | same build as `backend` | — | one-shot Alembic + seed runner |
| `backend` | built from `backend/Dockerfile` | 8000 | FastAPI runtime |
| `frontend` | built from `frontend/Dockerfile` | 8080 → 80 | static SPA served by nginx, proxies `/api` and `/docs` |

Target startup order: `db` healthy → `migrate` completes successfully → `backend` →
`frontend`. Never start the API before migrations finish; never seed from the frontend.

The current MVP runs migrations inside `backend/entrypoint.sh` because there is exactly one
backend instance. Treat that as a development convenience, not the deployment model — see §5.

## 2. Dockerfiles

- Multi-stage builds: build dependencies in a builder stage, copy only artifacts to runtime.
- Pin base image minor versions (`python:3.12-slim`, `node:22-alpine`, `nginx:1.27-alpine`);
  no `latest`.
- Run as a non-root user in the final image; no shell tools installed "just in case".
- One process per container. No supervisord, no cron inside app containers.
- `.dockerignore` must exclude `node_modules`, `.venv`, `dist`, tests caches, `.env`, `.git`.
- Cache-friendly order: copy dependency manifests → install deps → copy source.
- `HEALTHCHECK` or Compose `healthcheck` for every long-running service.

## 3. Docker Compose

- Environment comes from `${VAR:-default}`; every variable has a documented default in
  `.env.example`. No secrets with real values in the file.
- Dependencies use conditions, not sleeps:
  `depends_on: { db: { condition: service_healthy } }`.
- Named volume for PostgreSQL data. Never bind-mount the database directory on Windows.
- No `container_name` (the project prefix already scopes names). No `network_mode: host`.
- Keep dev-only overrides in `docker-compose.override.yml` (gitignored or documented);
  the base file must stay production-sane.
- CPU/RAM limits are optional for the MVP but must be justified if added. When enabled, set
  reservations and limits per service and document the numbers.

## 4. Configuration and secrets

- Single source: environment variables → `app.core.config` (Pydantic settings, typed,
  validated at startup). Fail fast on missing/invalid production values.
- `.env.example` is the contract: every key documented with a safe default. `.env` is
  gitignored and never committed.
- `JWT_SECRET`, `PROVIDER_PASSWORD`, `GEOAPIFY_API_KEY` are secrets. In production they
  must be injected by the platform, not baked into images.
- Build args must never carry secrets; they persist in image history.

## 5. Migrations and seed (target: one-shot job)

- **Target deployment:** migrations and seed run once in a dedicated `migrate` job before
  any backend instance starts
  (`depends_on: migrate: { condition: service_completed_successfully }`). This avoids races
  when several backend replicas start in parallel.
- **Current MVP:** one backend instance, so `entrypoint.sh` runs `alembic upgrade head` and
  the seed itself. Do not scale the backend beyond one instance until migrations move out.
- If migrations must stay in the entrypoint temporarily, wrap them in a PostgreSQL advisory
  lock (`pg_advisory_lock`) so concurrent instances serialize instead of racing.
- Migrations must be backwards compatible for rolling deploys: add columns as nullable or
  with defaults, backfill, then tighten in a later release.
- Never run destructive migrations automatically in production without a backup.
- Seed is idempotent, creates only missing records and skips the Provider when its e-mail
  already exists (never resets password or role). It must never overwrite operator data.
- Ad-hoc commands (`docker compose run --rm backend pytest`) must skip seed and server.

## 6. Health, logs and observability

- `GET /health` → liveness (process up). `GET /api/v1/health/db` → readiness (DB reachable).
- Health endpoints stay unauthenticated, cheap and side-effect free.
- Logs go to stdout/stderr as structured, single-line messages. No log files inside
  containers. Never log tokens, passwords, full request bodies or lockbox codes.
- Include a request id in error logs once middleware is added; keep log levels meaningful
  (`INFO` lifecycle, `WARNING` recoverable, `ERROR` failures).
- Compose healthchecks are the source of truth for `docker compose ps`.

## 7. nginx (frontend)

- Serve `index.html` for unknown routes (SPA fallback), but return real 404s for `/api`.
- Proxy `/api/`, `/docs`, `/redoc`, `/openapi.json` to `backend:8000`; preserve
  `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- Long-cache hashed assets (`/assets/*`) with `immutable`; never cache `index.html`.
- Enable gzip/brotli for text assets; set sensible security headers (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`) once the app is public.
- Client body limit must allow the largest expected JSON payload (keep it small; no uploads
  in the MVP).

## 8. CI expectations

When CI is added, it must run in this order and fail fast:

1. Backend: `ruff check .` → `ruff format --check .` → `pytest -q`.
2. Frontend: `npm ci` → `npm run typecheck` → `npm run build`.
3. Docker: `docker compose build` (no push on pull requests).
4. Migrations: `alembic upgrade head` against an ephemeral PostgreSQL service.
5. Compose smoke test: `docker compose up -d --build` from an empty volume, wait until all
   services are healthy, call `/health` and `/api/v1/health/db`, then `docker compose down -v`.

Cache dependencies (pip/npm) by lockfile hash. CI must never use production secrets.

## 9. Change checklist

- [ ] New env var documented in `.env.example` and wired in `docker-compose.yml`.
- [ ] No secrets, credentials or `.env` files added to Git.
- [ ] Images pinned, multi-stage, non-root, `.dockerignore` updated.
- [ ] Healthchecks still pass: `docker compose ps` shows `healthy` for all services.
- [ ] Migrations run once (dedicated job) or are serialized; backend starts after them.
- [ ] Fresh start works from an empty volume:
      `docker compose down -v && docker compose up -d --build`.
- [ ] README updated for any command, port or URL change.
