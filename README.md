# Monotickets Backend API

Backend service for managing events, invites, and real-time check-ins for the Monotickets platform. Built with NestJS, PostgreSQL (TypeORM), JWT authentication, Redis-backed counters, and Socket.IO for live occupancy updates.

## Features

- JWT authentication with role-based access control (SUPERADMIN, ADMIN, STAFF)
- Event management (CRUD subset) for admins
- Invite issuance with UUID tokens and guest lookup
- Staff check-ins with duplicate detection, offline batch sync, and Redis-based inside counters
- WebSocket namespace `/ws` broadcasting `inside_incr` events
- Dockerized development stack (API + PostgreSQL + Redis)
- Comprehensive unit tests and E2E coverage for happy paths and critical error flows

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 9
- PostgreSQL 15+
- Redis 7+
- (Optional) Docker & Docker Compose for containerized setup

### Installation

```bash
npm install
```

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Description |
| --- | --- |
| `PORT` | API listening port (default 3000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection settings |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT signing secret and expiration (seconds) |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` | Seeded SUPERADMIN credentials |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeded ADMIN credentials |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection settings |
| `SEED_USERS` | Set to `false` to disable automatic user seeding |

### Running the App (Local)

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.

### Docker Workflow

```bash
docker-compose up --build
```

This starts the API, PostgreSQL, and Redis services. The API watches local file changes for hot reload in development mode.

### Testing

- Unit tests: `npm test`
- Coverage report: `npm run test:cov`
- E2E tests (in-memory SQLite): `npm run test:e2e`

> **Note:** E2E tests override the database configuration to use SQLite in-memory and stub the Redis service to keep the suite self-contained.

### Linting

```bash
npm run lint
```

## API Overview

All routes are prefixed with `/api/v1`.

### Authentication

`POST /api/v1/auth/login`

Request:
```json
{
  "email": "admin@example.com",
  "password": "ChangeMe123!"
}
```

Response:
```json
{
  "token": "<jwt>",
  "expiresIn": 3600,
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### Events (Admin)

- `GET /api/v1/admin/events`
- `POST /api/v1/admin/events`
- `PUT /api/v1/admin/events/:id`

### Invites

- `POST /api/v1/admin/events/:eventId/invites`
- `POST /api/v1/admin/events/:eventId/invites/batch`
- `GET /api/v1/admin/events/:eventId/invites`
- `GET /api/v1/guest/invite/:token`

### Check-ins (Staff)

- `POST /api/v1/staff/checkin`
- `POST /api/v1/staff/checkin/sync`

Check-in responses include duplicate detection status and the current `insideCount` obtained via Redis.

### WebSocket

Connect to `ws://<host>:<port>/ws` and listen for the `inside_incr` event:

```json
{
  "eventId": "<uuid>",
  "delta": 1,
  "insideCount": 42
}
```

## Project Structure

```
src/
├── auth
├── checkins
├── common
├── events
├── invites
├── redis
├── users
└── websocket
```

- `common`: Shared decorators, guards, and enums
- `redis`: Redis service abstraction with in-memory fallback
- `websocket`: Socket.IO gateway for occupancy events

## Seeding

On startup, the service seeds a SUPERADMIN and ADMIN user using credentials specified in the environment. Disable this behavior by setting `SEED_USERS=false`.

## Change Management

Critical contracts are annotated with `// [CONTRACT-LOCK:<id>] NO MODIFICAR SIN MIGRACIÓN`. Any modifications require updating tests and documenting a migration in `CHANGELOG.md`.

## License

MIT
