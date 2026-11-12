# Backend Guide — FastAPI, SQLAlchemy, Alembic

Read [`AGENTS.md`](../../AGENTS.md) first. This guide adds backend-specific rules.

## 1. Stack and layout

Python 3.12 · FastAPI · SQLAlchemy 2.0 (sync) · psycopg 3 · Alembic · PostgreSQL 17 ·
Pydantic 2 · ruff (line length 100).

```
app/
  main.py              # app factory, middleware, exception handlers, router mount
  api/v1/              # HTTP layer: routers only
    health.py
    router.py
  core/                # config, security, shared infrastructure helpers
  db/                  # session, Base, enums, mixins, types, seed
  modules/<domain>/    # one package per bounded context
    models.py          # SQLAlchemy models
    schemas.py         # Pydantic request/response models
    service.py         # business logic + transactions
    router.py          # endpoints, auth dependencies, HTTP mapping
    dependencies.py    # optional: module-specific DI providers
```

Modules: `users`, `vehicles`, `employees`, `pricing`, `bookings`, `handover`, `locations`.
Cross-module imports are allowed only from `models`/`service` — never import another
module's router.

## 2. Layering rules

| Layer | May do | Must not do |
| --- | --- | --- |
| `router.py` | parse request, call service, map domain errors to HTTP | contain business rules, build SQL, commit |
| `service.py` | validate invariants, lock rows, price, assign resources, commit/rollback | know about `HTTPException`, FastAPI types |
| `models.py` | schema, constraints, relationships | business logic, I/O |
| `schemas.py` | validation, serialization, OpenAPI docs | DB access |

- **Transaction boundary = one service function.** Routers never call `db.commit()`.
- Use `Session` injected through `Depends(get_db)`; one session per request.
- Raise typed domain errors (e.g. `ConflictError`, `NotFoundError`, `ValidationError`)
  from services and translate them centrally in `main.py` (or a module exception map).
- Dependencies for auth (`get_current_provider`) live in `core/security.py` or
  `api/dependencies.py`; they return a typed `User`, not a raw dict.

## 3. Database rules

- Always declare constraints in the model: `CheckConstraint`, `UniqueConstraint`,
  `ForeignKey(..., ondelete=...)`, explicit indexes for every query filter/sort you add.
- IDs: UUID v4 via `UUIDPrimaryKeyMixin`. Timestamps: `TimestampMixin` (UTC, server default).
- Enums: `StrEnum` + `enum_type(...)` from `app.db.types` so PostgreSQL stores lower-case
  values. Never store free-text where an enum exists.
- Money: `Numeric(10, 2)` + `Decimal` in Python. Never `float`.
- Distances: `Numeric(8, 2)` km; coordinates: `Numeric(9, 6)`.
- Relationships: set `cascade` deliberately; never rely on `delete-orphan` for shared
  reference data (vehicles, employees, pricing).
- **Availability needs both application and database guards.** Any write that consumes a
  vehicle/employee window must:
  1. lock the resource row(s) with `SELECT ... FOR UPDATE` in a deterministic order,
  2. re-check conflicts inside the same transaction (including the buffer),
  3. insert, and let the database reject anything the service missed.
- Row locks do not protect a resource that has no booking row yet — two first-time
  bookings can pass a naive check. Add a PostgreSQL exclusion constraint as the final guard,
  e.g. for vehicles:
  `EXCLUDE USING gist (vehicle_id WITH =, tstzrange(start_datetime, end_datetime, '[)') WITH &&)`
  (requires `btree_gist`), with a predicate skipping `cancelled`/`rejected` bookings.
  Employee assignments live in `booking_employees`, so store the occupied window on the
  assignment (or in a dedicated allocation table) and protect it with the same constraint.
- **The buffer is configuration, not a constant.** `RESOURCE_BUFFER_MINUTES` (default 60) is
  the fallback; travel time between locations and preparation time should refine it. Resolve
  buffer and travel time in one helper so availability, pricing and auto-assignment agree.
- Avoid N+1: use `selectinload`/`joinedload` for lists returned by the API. Add a query
  budget note in the PR/commit when a list endpoint loads relations.
- Pagination is mandatory for any list that can grow (bookings, events). Default limit 20,
  max 100.

## 4. Migrations (Alembic)

- One migration per logical change, generated with
  `alembic revision --autogenerate -m "short description"` inside Docker.
- **Always review the generated file.** Remove noise, order table/enum creation correctly,
  and write a working `downgrade()`.
- Never edit a migration that has been applied outside your machine; add a new one.
- Native enums need explicit `create_type=False` handling and `checkfirst=True` creation.
- Constraints that need extensions (e.g. `btree_gist` for exclusion constraints) create and
  drop those extensions explicitly in the migration.
- Data migrations are separate from schema migrations; seed data belongs in
  `app/db/seed.py` and must stay **idempotent**.
- Verify: `alembic upgrade head`, then `alembic downgrade -1`, then `upgrade head` on a
  disposable database when the migration is non-trivial.

## 5. API contract

- All routes under `/api/v1`. Use plural resource nouns (`/vehicles`, `/bookings`).
- Request/response bodies are explicit Pydantic schemas (`XxxCreate`, `XxxUpdate`,
  `XxxRead`). Never return ORM objects directly; never expose `password_hash`,
  `access_token_hash` or lockbox ciphertext.
- Status codes: `201` create, `204` delete, `400` malformed domain input, `401` missing/bad
  token, `403` wrong role, `404` missing resource, `409` conflict (double booking, duplicate
  e-mail), `422` schema validation.
- Error body: `{"detail": "Human readable message"}`; add a machine `code` only if the
  frontend needs to branch on it.
- Timestamps are ISO 8601 with timezone. Accept only timezone-aware input; normalize to UTC.
- Guest access tokens are opaque: return the token **once**, store only its SHA-256 hash.
  A lost token is reissued, never recovered.
- Lockbox codes must be recoverable, so **never hash them**. Encrypt with AES-256-GCM using
  a key from settings (store key version, nonce and ciphertext), decrypt only inside the
  authorized handover endpoint. The Provider can read and regenerate the code; the customer
  receives it only at the appropriate moment through the guest-access endpoint.
- Provider-only routes declare `dependencies=[Depends(get_current_provider)]`; never rely
  on the frontend to hide them.

## 6. Security

- Passwords: `pwdlib` argon2 via `app.core.security`. Never log credentials or tokens.
- JWT: secret and expiry from settings; validate `exp`, `sub` and role. No `none` algorithm.
- Encryption keys come from settings, never from source; support rotation by storing a key
  version alongside each ciphertext.
- Redact secrets and lockbox codes in logs and exception handlers.
- Validate all external input, including Geoapify responses; never interpolate SQL strings.
- CORS origins come from settings, never `*` when credentials are enabled.
- Do not log full request bodies (they contain personal data).

## 7. Performance and correctness

- Prefer one well-indexed query over loops in Python. Check `EXPLAIN` for list endpoints
  once data grows.
- Keep transactions short: no HTTP calls (Geoapify) inside a transaction holding row locks
  — resolve geo data first, then open the locking transaction.
- Cache only immutable, expensive reference data, and only with a measured need.
- Guard invariants with DB constraints *and* service checks (defence in depth).

## 8. Testing

- `pytest` in `backend/tests`, fixtures in `conftest.py`. Unit-test services; use
  dependency overrides or a test database for endpoints.
- Every bug fix gets a regression test. Every concurrency rule gets two levels of test:
  service-level (simulated parallel requests) and database-level (an overlapping insert is
  rejected by the exclusion constraint).
- Tests must be deterministic: freeze time or pass explicit datetimes; never depend on
  "now" or execution order. Clean up seeded rows between tests.
- Target: new/changed service logic covered; do not chase a global percentage.

## 9. Backend checklist

- [ ] Size/complexity goals considered; exceptions are justified.
- [ ] Types on public functions; no bare `except`, no `print`.
- [ ] Router thin, service transactional, model constrained.
- [ ] Money `Decimal`, datetimes UTC-aware, enums reused.
- [ ] Availability guarded by locks, conflict re-check and an exclusion constraint.
- [ ] Guest token hashed; lockbox code encrypted, decryptable only by authorized roles.
- [ ] New query has an index; no N+1 on list endpoints.
- [ ] Migration reviewed, downgrade works, seed still idempotent.
- [ ] `ruff check`, `ruff format --check`, `pytest` pass.
