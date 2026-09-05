# NestJS Modular Monolith Boilerplate

Opinionated REST API starter for Node.js 24, NestJS 11, PostgreSQL, and TypeORM. The repository
follows [CONVENTIONS.md](./CONVENTIONS.md); read it before making a non-trivial change.

The included `tasks` capability is intentionally small. It demonstrates the expected request
flow without introducing architecture that the application has not earned:

```text
HTTP request
  -> global authentication and permission guards
  -> TaskController (transport and response mapping)
  -> TasksService (use cases and business rules)
  -> TaskRepository (TypeORM operations)
  -> PostgreSQL
```

## Included

- deny-by-default OAuth access-token verification with remote JWKS (`jose`);
- scope-based permissions such as `tasks:read` and `tasks:create`;
- validated, typed application/auth/database configuration;
- explicit TypeORM repository boundary and migration-only schema changes;
- UUID request correlation and a safe shared error response;
- versioned `/api/v1` routes plus version-neutral health checks;
- OpenAPI generation and development-only Swagger UI;
- Bruno requests for every included route;
- unit and HTTP e2e examples;
- multi-stage, non-root Docker image and local PostgreSQL Compose service.

## Requirements

- Node.js 24 LTS
- npm 11
- Docker with Compose (recommended for local PostgreSQL)
- an OAuth/OIDC provider that exposes a JWKS endpoint

## Start locally

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run migration:run
npm run seed
npm run start:dev
```

The API listens on `http://localhost:3000` by default. Swagger UI is available only in the
`development` environment at `http://localhost:3000/docs`.

The example values in `.env.example` are placeholders. Protected task routes need a real access
token whose issuer, audience, signing algorithm, `client_id`, and scopes match the configured
OAuth provider. Health routes are public.

Database configuration uses separate values rather than one connection URL:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=app
DATABASE_PASSWORD=app
DATABASE_NAME=nest_boilerplate
DATABASE_SCHEMA=public
```

`DATABASE_PASSWORD` is required in every environment and has no application fallback.

## Example API

| Method   | Path                         | Permission       | Purpose            |
| -------- | ---------------------------- | ---------------- | ------------------ |
| `GET`    | `/api/health/live`           | public           | Process liveness   |
| `GET`    | `/api/health/ready`          | public           | Database readiness |
| `GET`    | `/api/v1/tasks`              | `tasks:read`     | Paginated list     |
| `GET`    | `/api/v1/tasks/:id`          | `tasks:read`     | Read one task      |
| `POST`   | `/api/v1/tasks`              | `tasks:create`   | Create a task      |
| `PATCH`  | `/api/v1/tasks/:id`          | `tasks:update`   | Edit task content  |
| `POST`   | `/api/v1/tasks/:id/complete` | `tasks:complete` | Complete a task    |
| `DELETE` | `/api/v1/tasks/:id`          | `tasks:delete`   | Delete a task      |

Example request:

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Review pull request","description":"Check module boundaries"}'
```

Use the committed collection under `bruno/` for the complete workflow. Copy
`bruno/.env.sample` to `bruno/.env` or expose `ACCESS_TOKEN` to Bruno; never commit the token.

## Common commands

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run openapi:generate

npm run migration:generate
npm run migration:run
npm run migration:revert
npm run seed
```

`openapi:generate`, migrations, and the seed command require valid environment configuration.
The application never runs migrations or seeds during startup. Bruno remains manual executable
documentation and is not part of CI.

## Add a capability

Start under `src/modules/<capability>/`. Keep controllers limited to HTTP concerns, put business
rules in the capability service, and keep every database operation inside `repositories/`.
Controllers always map entities to explicit response DTOs. Do not export module internals; export
only a service when another capability genuinely needs its behaviour.

For every route, add OpenAPI metadata, a Bruno request, and relevant automated tests. For every
entity change, add and review a migration. Do not introduce a dependency, shared abstraction, or
new architectural pattern during feature work without updating the convention separately.
