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
| 2 | Database models, Alembic migrations, demo seed | Planned |
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
