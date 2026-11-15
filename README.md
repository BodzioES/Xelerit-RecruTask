# JanuszTrans

A booking platform for one moving and van company in the Tri-City area (Gdańsk, Gdynia, Sopot,
up to ~30 km around). Customers book one of three services without an account, and the company
runs everything from a Provider panel. Built as a full-stack MVP for a recruitment task.

## Features

**For customers**

- Three services: **Self Drive** (rent a van), **Van + Driver** (transport) and **Full Moving**
  (van, driver and a crew of movers).
- Step-by-step booking wizard: addresses by search or a click on the map, date, van, job details,
  crew, a live quote with every price line, contact details and a summary.
- Only free vans can be picked; booked ones are marked, and a filter hides them.
- **AI move assistant:** describe the move in your own words and the form fills itself in
  (see [below](#ai-move-assistant)).
- A private booking page (link with a token) with the status timeline, cancellation and, for
  Self Drive, the lockbox code once the van is ready.
- Landing page with the fleet and the current rates, both loaded from the API.

**For the Provider (company)**

- Dashboard with new, overdue, upcoming and active bookings and the vans free right now.
- Status changes with a history, rescheduling (the price is recalculated), resource reassignment
  and phone bookings entered with the same wizard.
- Lockbox handover for Self Drive: an encrypted 6-digit code and pickup instructions.
- Fleet, employee and downtime management. A van or employee with open bookings cannot be
  deactivated.
- Editable pricing rules for every service.

## Tech stack

| Area | Technologies |
| --- | --- |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic, Alembic, PostgreSQL 17 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Zod |
| Maps | Leaflet, OpenStreetMap, Geoapify (geocoding and driving routes) |
| AI | Groq (free tier): `openai/gpt-oss-120b` and Llama Prompt Guard 2 |
| Infrastructure | Docker Compose, nginx |

The backend is a modular monolith (`backend/app/modules/*`: bookings, availability, pricing,
locations, handover, assistant…). The frontend is a React SPA (`frontend/src`) served by nginx,
which also proxies `/api` to the backend.

**Interesting solutions**

- **No double bookings, even under concurrency.** Availability is checked in the booking
  transaction, and PostgreSQL `EXCLUDE USING GIST` constraints on time ranges are the final guard.
  A 60-minute buffer separates two jobs of the same van or employee.
- **The server owns every price.** Quotes are calculated on the backend with `Decimal`, and the
  booking recalculates the price inside its transaction. The frontend only displays the breakdown.
- **Secure guest access.** The booking link token is shown once and stored only as a SHA-256 hash.
  Lockbox codes are encrypted with AES-256-GCM, and the guest sees them only when the van is ready.
- **Controlled status flow.** Every transition is validated and recorded with its author.

**Why PostgreSQL instead of SQLite?** The task suggests SQLite or an in-memory database to keep the
setup simple. The core promise of this app, never booking one van twice, relies on PostgreSQL range
exclusion constraints, which SQLite does not have. The setup stays one command: the database runs
in the same Compose stack, and migrations and demo data are applied automatically.

## Getting started

Requirements: **Docker with Docker Compose**. Nothing else has to be installed.

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Add the free API keys to `.env`:

   | Key | Where to get it | Needed for |
   | --- | --- | --- |
   | `GEOAPIFY_API_KEY` | https://myprojects.geoapify.com/ (free, no card) | **Required** for address search and the map, so without it a booking cannot be completed |
   | `GROQ_API_KEY` | https://console.groq.com/keys (free, no card) | Optional: the AI assistant. Without it the assistant is hidden |

3. Start the stack (migrations and demo data run automatically):

   ```bash
   docker compose up --build
   ```

4. Open the app:

   | Service | URL |
   | --- | --- |
   | Frontend | http://localhost:8080 |
   | Provider panel | http://localhost:8080/provider |
   | Swagger UI | http://localhost:8000/docs |

After editing `.env` later, run `docker compose up -d --force-recreate`. Stop with
`docker compose down`.

### Demo data

The idempotent seed creates the Provider account (`PROVIDER_EMAIL` / `PROVIDER_PASSWORD`, by
default `provider@janusztrans.local` / `provider123`), 4 vans, 6 employees (3 drivers, 3 movers),
the pricing rules and 3 bookings: `MV-2026-000001` (Full Moving, pending), `MV-2026-000002`
(Self Drive, confirmed) and `MV-2026-000003` (Van + Driver, completed).

## Testing

```bash
docker compose run --rm backend ruff check .           # lint
docker compose run --rm backend ruff format --check .  # formatting
docker compose run --rm backend pytest                 # backend tests
docker compose build frontend                          # TypeScript check + production build
cd frontend && npm ci && npm test                      # frontend unit tests (Node 22)
```

## API

The full interactive documentation is in Swagger (`/docs`) and ReDoc (`/redoc`). Provider endpoints
need `Authorization: Bearer <token>` from `POST /api/v1/auth/login`, and guest endpoints use the
booking token (`X-Booking-Token` header or `?token=`). Main endpoints, all under `/api/v1`:

| Area | Endpoints |
| --- | --- |
| Catalog | `GET /vehicles`, `GET /pricing/rules` |
| Availability | `GET /availability/vehicles`, `GET /availability/employees`, `POST /availability/check` |
| Pricing | `POST /pricing/quote` (server-side quote with a line breakdown) |
| Locations | `GET /locations/search`, `GET /locations/reverse`, `POST /locations/validate` |
| Guest bookings | `POST /bookings`, `GET /bookings/{id}`, `PATCH /bookings/{id}/cancel`, `GET /bookings/{id}/handover` |
| AI assistant | `GET /assistant/status`, `POST /assistant/move-plan` |
| Provider bookings | `GET /provider/dashboard`, `GET`/`POST /provider/bookings`, `PATCH /provider/bookings/{id}/status`, `PATCH /provider/bookings/{id}/schedule`, `POST /provider/bookings/{id}/assign-resources`, `POST /bookings/{id}/handover` |
| Provider resources | CRUD on `/provider/vehicles` and `/provider/employees`, their `/unavailability` blocks, `GET`/`PATCH /provider/pricing-rules` |

## Business rules

- **Service area:** every address must be within 30 km of the Sopot pier (configurable).
- **Availability:** a booking holds its van and staff for the whole window plus a 60-minute
  buffer. Cancelled and rejected bookings free them again.
- **Pricing:** time is billed in started hours with a minimum per service.
  - **Self Drive:** the van's hourly rate under 24 h, then full days plus extra hours, which never
    cost more than one more day. No charge per kilometre.
  - **Van + Driver:** base fee + hours + driving-route kilometres.
  - **Full Moving:** the same, plus a fee per mover, a surcharge per floor and a no-elevator
    surcharge.
- **Statuses:** `pending → confirmed → (ready_for_pickup) → in_progress → completed`, with
  `rejected` and `cancelled` as exits. Self Drive must pass `ready_for_pickup`, which requires a
  lockbox code and pickup instructions. Guests can cancel until the service starts.

## AI move assistant

Customers rarely know how many movers or what size of van they need. On the "Job details" step of
Van + Driver and Full Moving they can describe the job in any language, for example *"2-room flat
on the 3rd floor without a lift, sofa, fridge, washing machine and about 20 boxes"*. The assistant
fills in the property type, floor, elevator, boxes, item list and the suggested crew size, explains
its choice in one sentence and can suggest switching to the better-fitting service.

The AI only pre-fills the form. The customer reviews every field, and the server still calculates
the price and availability, so the model can never set a price or book anything.

The system prompt lives in
[`backend/app/modules/assistant/prompts/move_plan_system.md`](backend/app/modules/assistant/prompts/move_plan_system.md).
Customer text is untrusted, so it is defended in layers:

1. **Input limits:** 10–2000 characters, with control characters and the data delimiter tags
   stripped.
2. **Prompt-attack classifier:** Llama Prompt Guard 2 refuses obvious attacks before the main
   model sees them.
3. **Prompt rules:** the description is wrapped in tags and treated as data. The model ignores
   instructions inside it, never reveals the prompt and never talks about prices or availability.
4. **Strict output validation:** JSON mode plus a Pydantic schema. Invalid answers are rejected,
   helpers are capped, and text with links, e-mail addresses or markup is dropped.
5. **Abuse limits:** 10 requests per minute per client, a timeout and a token budget. The key
   stays on the server, and descriptions are never logged.

## Known limitations

- No customer accounts, online payments, e-mail notifications or calendar sync (out of MVP scope).
  A lost booking link cannot be recovered.
- The lockbox is physical: the code is generated in the app but set on the box by hand.
- Self Drive has no mileage limit, and only the pickup and return points are checked against the
  service area.
- Status changes are not tied to the clock; overdue bookings are highlighted on the dashboard
  instead.
- The AI rate limit is in memory of a single API process and trusts the `X-Real-IP` header set by
  nginx.

## AI usage

The project was built with **Claude Code** as a coding assistant. Inside the app, AI powers only
the [move assistant](#ai-move-assistant).

- **Specification first:** the functional scope (services, booking rules, statuses, pricing,
  service area) was written down before any code, and every task referred to it.
- **Rules for the agent:** [`AGENTS.md`](AGENTS.md) and [`docs/agents/`](docs/agents/) define the
  code standards (file and function size, one responsibility per file, `Decimal` for money, the
  server owning prices, no dead code) and the checks that must pass. They are committed so the
  setup can be reviewed.
- **Small, verified steps:** each step was checked with `ruff`, `pytest` and the TypeScript build
  before committing.
- **Human review:** generated code was read, tested in the browser and corrected. Business
  decisions (pricing, status flow, handover, MVP scope) were made by me.
