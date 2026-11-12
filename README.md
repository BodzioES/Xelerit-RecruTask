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
| 3 | Provider auth, vehicle and employee management | Done |
| 4 | Availability engine (vehicles, employees, buffers, concurrency) | Done |
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

### Provider authentication

The seeded Provider logs in with `PROVIDER_EMAIL` / `PROVIDER_PASSWORD`:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "provider@moveit.local", "password": "provider123"}'
```

The response contains a bearer token valid for `ACCESS_TOKEN_EXPIRE_MINUTES`. Send it as
`Authorization: Bearer <token>` to every `/api/v1/provider/...` endpoint. The token is
validated against the `provider` role; guest and customer routes stay public.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | — | Obtain a Provider token |
| GET | `/api/v1/auth/me` | Provider | Current Provider profile |
| GET | `/api/v1/vehicles` | — | Active vehicles (public catalog) |
| GET | `/api/v1/vehicles/{id}` | — | Active vehicle details |
| GET | `/api/v1/provider/vehicles` | Provider | Full fleet, including inactive |
| POST | `/api/v1/provider/vehicles` | Provider | Add a vehicle |
| PATCH | `/api/v1/provider/vehicles/{id}` | Provider | Edit or reactivate a vehicle |
| DELETE | `/api/v1/provider/vehicles/{id}` | Provider | Deactivate a vehicle |
| GET | `/api/v1/provider/employees` | Provider | List employees, including inactive |
| POST | `/api/v1/provider/employees` | Provider | Add an employee |
| PATCH | `/api/v1/provider/employees/{id}` | Provider | Edit, reactivate or change a role |
| DELETE | `/api/v1/provider/employees/{id}` | Provider | Deactivate an employee |
| GET | `/api/v1/availability/vehicles` | — | Vehicles free for a time window |
| GET | `/api/v1/availability/employees` | — | Employees free for a time window |
| POST | `/api/v1/availability/check` | — | Check one vehicle and a set of employees |
| GET | `/api/v1/provider/employees/availability` | Provider | Same employee check for the Provider panel |
| GET | `/api/v1/provider/vehicles/{id}/unavailability` | Provider | Vehicle downtime periods |
| POST | `/api/v1/provider/vehicles/{id}/unavailability` | Provider | Block a vehicle (service, repair) |
| DELETE | `/api/v1/provider/vehicles/{id}/unavailability/{blockId}` | Provider | Remove a downtime period |
| GET | `/api/v1/provider/employees/{id}/unavailability` | Provider | Employee unavailability periods |
| POST | `/api/v1/provider/employees/{id}/unavailability` | Provider | Block an employee (leave, training) |
| DELETE | `/api/v1/provider/employees/{id}/unavailability/{blockId}` | Provider | Remove an employee block |

### Availability rules

- Time windows are half-open (`start` inclusive, `end` exclusive) and must include a
  timezone offset. Naive datetimes and inverted windows return `422`.
- A booking occupies its resource for the whole window. Cancelled and rejected bookings
  release it again; other statuses keep it.
- `RESOURCE_BUFFER_MINUTES` (default `60`) is the required gap between two bookings of the
  same vehicle or employee. Downtime blocks are exact and do not add the buffer.
- Availability is checked at search time and must be checked again inside the booking
  transaction. PostgreSQL `EXCLUDE USING GIST` constraints on `bookings`,
  `booking_employees`, `vehicle_unavailability` and `employee_unavailability` are the final
  guard, so two concurrent requests can never double-book the same resource.
- Only active vehicles and employees are returned by the public availability endpoints.
  Capacity filters (`min_cargo_volume`, `min_payload`, `min_seats`) are optional.

Example:

```bash
curl "http://localhost:8000/api/v1/availability/vehicles?\
start_datetime=2027-05-10T10:00:00Z&end_datetime=2027-05-10T14:00:00Z&min_cargo_volume=11"
```

```bash
curl -X POST http://localhost:8000/api/v1/availability/check \
  -H "Content-Type: application/json" \
  -d '{
    "start_datetime": "2027-05-10T10:00:00Z",
    "end_datetime": "2027-05-10T14:00:00Z",
    "vehicle_id": "<vehicle-id>",
    "employee_ids": ["<employee-id>"]
  }'
```

## Known MVP limitations

- Guest bookings only (no customer accounts in the MVP).
- No online payments, reviews, notifications or calendar integrations.
- The vehicle lockbox is physical: the backend generates and stores a 6-digit code, but the
  driver sets it manually.
- No separate admin role — the Provider manages all company resources.

## AI usage

AI assistance is used for scaffolding, implementation and documentation. All generated code is
reviewed, tested and adapted to the specification. Detailed notes are maintained in this README.
