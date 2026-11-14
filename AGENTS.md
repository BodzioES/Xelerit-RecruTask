# Agent Guide — JanuszTrans

This file is the entry point for any AI agent (or human) contributing to this repository.
Read it before touching code, then read the guide for the area you are working in.

| Area | Guide |
| --- | --- |
| Backend (FastAPI, SQLAlchemy, Alembic) | [`docs/agents/backend.md`](docs/agents/backend.md) |
| Frontend (React, TypeScript, Tailwind) | [`docs/agents/frontend.md`](docs/agents/frontend.md) |
| DevOps (Docker, Compose, nginx, CI) | [`docs/agents/devops.md`](docs/agents/devops.md) |

## 1. Project context

JanuszTrans is a full-stack MVP for a single-company van rental, transport-with-driver and
full-moving business in Trójmiasto (Poland). The functional source of truth is the local
`tresc-projektu.md` (not tracked in Git). If a request contradicts it, ask before coding.

- Architecture: modular monolith — React SPA + FastAPI + PostgreSQL, one Compose stack.
- Users: guests book without an account; one seeded Provider account manages the company.
- Scope is fixed. Do not add features (payments, e-mail, reviews, customer accounts,
  separate admin role, calendar sync) unless the user explicitly asks for them.
- Everything committed — code, comments, UI copy, docs, commits — is written in **English**.
  Conversation with the user is in **Polish**.

## 2. Core rules

1. **File size (default goal):** aim for ≤ **300 lines** per hand-written source file
   (target 150–250). Treat the limit as a review trigger, not an absolute ban: if a file
   stays clearer slightly longer, justify it in the change summary instead of splitting it
   artificially. Generated files (Alembic migrations, lock files) and documentation are
   exempt, but migrations still get reviewed.
2. **Function size and complexity (default goals):** aim for ≤ **50 lines** per
   function/method, ≤ **3 levels** of nesting and cyclomatic complexity ≤ 10. Crossing
   these is a signal to review the code, not an obligation to extract helpers — a 60-line
   function can be clearer than five artificial ones. Prefer early returns over deep `if`
   pyramids.
3. **One responsibility per file.** `models.py`, `schemas.py`, `service.py`, `router.py`
   stay separate. No "utils" dumping grounds — name the concern (`money.py`, `geo.py`).
4. **No dead code.** No commented-out blocks, unused imports, placeholder TODOs or
   "just in case" abstractions. Delete what you replace.
5. **Types everywhere.** Python: full type hints on public functions. TypeScript:
   `strict` mode, no `any`, no non-null assertions unless provably safe.
6. **Money and time:** `Decimal` for money (never `float`), timezone-aware UTC
   datetimes (`datetime.now(UTC)`), never naive datetimes in the domain.
7. **Server owns truth.** Prices, availability, distances and statuses are computed on the
   backend. The frontend never recomputes a final price or fabricates availability.
8. **Secrets never enter Git.** Only `.env.example` with dummy values is tracked.
9. **Verification before reporting.** Lint, typecheck and tests must pass for the code you
   touched; documentation-only changes do not require the full suite.
10. **Ask, don't guess.** If a requirement is ambiguous or a change would cross a module
    boundary or the spec, stop and ask instead of inventing behaviour.

## 3. General coding rules

- **Optimize for reading.** Clear names beat clever one-liners. Early returns beat nesting.
- **Optimize only after measuring.** No caching, micro-optimizations or premature
  memoization without a described bottleneck. Prefer correct indexes and clean queries.
- **Fail loudly, once.** Validate at the boundary (Pydantic schemas), raise domain errors
  in services, translate them to HTTP in one place. Never swallow exceptions silently.
- **Explicit over implicit.** No magic globals, no import side effects, no monkey-patching.
- **Consistent naming:** `snake_case` (Python), `camelCase` (TS values), `PascalCase`
  (classes/components/types), `UPPER_SNAKE_CASE` (constants), `kebab-case` (files that are
  not modules, e.g. images).
- **Comments explain *why*, not *what*.** Keep them short and in English.
- **Documentation is part of the change.** Update `README.md` only when the change affects
  setup, configuration, API, demo data or other user-visible behaviour — not for internal
  refactors or routine code edits.

## 4. Working workflow

1. **Read first** — this file, the area guide, and the files you are about to change.
2. **Plan** — list the files to create/modify and the invariants you must preserve.
3. **Change small** — one logical step per commit; do not refactor unrelated code.
4. **Verify** — run the checks below in proportion to the change, plus a manual smoke test
   of the affected flow.
5. **Report** — summarize what changed, what was verified, and what is next.

### Verification commands

| Check | Command |
| --- | --- |
| Full stack up | `docker compose up -d --build` |
| Backend lint | `docker compose run --rm backend ruff check .` |
| Backend format check | `docker compose run --rm backend ruff format --check .` |
| Backend tests | `docker compose run --rm backend pytest -q` |
| Migration state | `docker compose run --rm backend alembic current` |
| Frontend typecheck + build | `docker compose build frontend` (runs `tsc --noEmit` + Vite build) |

If a tool is unavailable locally, run it inside Docker — never skip verification. Match the
effort to the risk:

- **Docs or wording only:** check links and rendering; the test suite is not required.
- **Isolated code change:** lint plus targeted tests for the touched area.
- **API, database, auth, pricing, availability or infrastructure:** full backend suite,
  frontend build and an end-to-end smoke test of the affected flow.

## 5. Definition of done

A task is done only when all of the following are true:

- [ ] Behaviour matches `tresc-projektu.md` and the agreed stage scope.
- [ ] Code follows the area guide; size/complexity goals were considered, and any
      deliberate exception is justified.
- [ ] Verification is proportional to the change; lint/typecheck/tests pass for touched code.
- [ ] No secrets, debug prints, dead code or unrelated formatting changes.
- [ ] Docs updated when the change affects instructions, configuration, API or behaviour.
- [ ] The change is committed with an English, conventional message and pushed.

Commit format: `type: short imperative summary` (`feat`, `fix`, `refactor`, `test`,
`docs`, `chore`, `build`, `ci`). One concern per commit.

## 6. When rules conflict

Priority order: **explicit user instruction → `tresc-projektu.md` → this guide**.
If following a rule would break the product or a database invariant, stop and explain the
trade-off to the user before writing code.
