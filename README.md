# MoveIt

MoveIt is a single-company web platform for van rental, transport with a driver and full
moving services in Trójmiasto (Gdańsk, Gdynia, Sopot) and up to ~30 km around it.

The project is an MVP built as a full-stack recruitment task. The priority is a correct,
end-to-end booking process — not a feature-rich commercial system.

## Status

| Milestone | Scope | Status |
| --- | --- | --- |
| 0 | Repository skeleton, tooling, environment template | Done |
| 1 | Docker Compose, FastAPI + PostgreSQL + React pipeline | Done |
| 2 | Database models, Alembic migrations, demo seed | Done |
| 3 | Provider auth, vehicle and employee management | Planned |
| 4 | Availability engine (vehicles, employees, buffers, concurrency) | Planned |
| 5 | Pricing engine | Planned |
| 6 | Locations, map integration, service-area validation | Planned |
| 7 | Bookings, guest access, statuses, handover | Planned |
| 8–10 | Frontend: landing page, booking wizard, confirmation | Planned |
| 11 | Provider panel | Planned |
| 12 | Tests, documentation, demo assets | Planned |

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic, Alembic, PostgreSQL 17
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router
- **Maps:** Leaflet, React Leaflet, OpenStreetMap, Geoapify (geocoding and routing)
- **Infrastructure:** Docker, Docker Compose, nginx

## Repository layout

```
backend/    FastAPI application (modular monolith)
frontend/   React SPA served by nginx
docker-compose.yml
.env.example
```

## Getting started

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Start the whole stack:

   ```bash
   docker compose up --build
   ```

3. Open:

   | Service | URL |
   | --- | --- |
   | Frontend | http://localhost:8080 |
   | API | http://localhost:8000/api/v1 |
   | Swagger UI | http://localhost:8000/docs (also http://localhost:8080/docs) |
   | PostgreSQL | `localhost:5433` (host port, configurable) |

4. Stop the stack:

   ```bash
   docker compose down
   ```

## Demo data

The backend entrypoint runs `alembic upgrade head` and then an idempotent seed
(`python -m app.db.seed`) on every start. The seed only creates records that are missing, so
restarting the stack never duplicates data.

Seeded records:

| Entity | Content |
| --- | --- |
| Provider account | 1 user with the `provider` role, credentials from `PROVIDER_EMAIL` / `PROVIDER_PASSWORD` |
| Vehicles | 4 active vans (Renault Master, Fiat Ducato, Ford Transit, Iveco Daily) with illustrations in `frontend/public/vehicles/` |
| Employees | 6 people: 3 drivers and 3 movers |
| Pricing rules | 1 rule per service type (`self_drive`, `van_driver`, `full_moving`) |
| Bookings | 3 demo bookings in different statuses (see below) |

| Booking number | Service | Status | Notes |
| --- | --- | --- | --- |
| `MV-2026-000001` | Full moving | `pending` | Loading/unloading addresses, item list, floor and lift details, 3 assigned employees |
| `MV-2026-000002` | Self-drive rental | `confirmed` | Pickup/return locations plus handover instructions |
| `MV-2026-000003` | Van + driver | `completed` | Full status history and one assigned driver |

Booking numbers come from the PostgreSQL sequence `booking_number_seq` in the
`MV-<year>-<6 digits>` format.

Useful maintenance commands:

```bash
# Re-run the seed manually (safe to repeat)
docker compose run --rm backend python -m app.db.seed

# Apply migrations / inspect the current revision
docker compose run --rm backend alembic upgrade head
docker compose run --rm backend alembic current
```

## Environment

All configuration lives in `.env` (see `.env.example`). Never commit `.env` or API keys.
The seeded provider account is created from `PROVIDER_EMAIL` / `PROVIDER_PASSWORD`.

Geoapify is optional during development: when `GEOAPIFY_API_KEY` is empty, the backend falls
back to a haversine-based distance estimate and reports it in the API response.

## Testing

```bash
docker compose run --rm backend pytest
```

## API documentation

FastAPI exposes OpenAPI 3.1 automatically:

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- Schema: `/openapi.json`

## Known MVP limitations

- Guest bookings only (no customer accounts in the MVP).
- No online payments, reviews, notifications or calendar integrations.
- The vehicle lockbox is physical: the backend generates and stores a 6-digit code, but the
  driver sets it manually.
- No separate admin role — the Provider manages all company resources.

## AI usage

AI assistance is used for scaffolding, implementation and documentation. All generated code is
reviewed, tested and adapted to the specification. Detailed notes are maintained in this README.
