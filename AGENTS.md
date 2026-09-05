# AGENTS.md

Read this before writing code in this repository.

This is the short form. The full rules are in **`CONVENTIONS.md`** — read it before any
non-trivial change, and whenever this file is silent. **If the two disagree,
`CONVENTIONS.md` wins.**

---

## What this service is

This is a **NestJS REST API modular monolith** running on Node.js 24 LTS with Express,
PostgreSQL, and TypeORM. Code is organised by business capability. Nest is an OAuth resource
server; an external OAuth/OIDC provider issues access tokens and a BFF forwards them.

The architecture is deliberately simple: controllers, services, repositories, entities, and
DTOs. Do not introduce Clean Architecture layers, one-class-per-use-case ceremony, an event bus,
a queue, or a cache unless a requirement calls for it and the convention is changed separately.

---

## The rules broken most often

1. **A module is a business capability, not a table.** `invoicing` owns Invoice, InvoiceLine,
   and TaxInvoice. Do not create one Nest module per entity.

2. **Respect hard module boundaries.** Another module may import the owning module and inject an
   explicitly exported service. It must never import another module's controller, repository,
   entity, DTO, or client. Store cross-module references as UUIDs. `forwardRef()` is forbidden;
   a cycle means the business ownership must be analysed again.

3. **Controllers are HTTP adapters only.** Validate input, read the authenticated principal,
   enforce permission metadata, call a service, and map a response DTO. Never inject a
   repository, `DataSource`, `EntityManager`, or external client into a controller. Do not use
   `@Req()` or `@Res()` except for a justified streaming/download/cookie case.

4. **Services own use cases and business rules.** Start with one `<module>.service.ts`; do not
   create one class per use case or a generic `BaseService`. Service input types live beside the
   service. A service must not import request/response DTOs.

5. **Repositories own database operations.** Only files in `repositories/` may use TypeORM
   `Repository<Entity>`, QueryBuilder, or execute queries. Do not create repository interfaces or
   a generic `BaseRepository`. Repositories return `null` for absence and do not throw HTTP
   exceptions.

6. **Transactions are local and explicit.** A transaction never crosses a module and never wraps
   an external HTTP call. Use `DataSource.transaction(async (manager) => ...)` only for a
   multi-write atomic use case, and pass that manager to every repository operation inside the
   callback. `QueryRunner` is exceptional, not the default.

7. **Never return a TypeORM entity from a controller.** Every route returns an explicit response
   DTO. Create, update, action, and response DTOs are separate contracts. A service does not
   import from `dto/`.

8. **Authentication is global and deny-by-default.** Verify bearer access tokens with `jose`
   against the configured JWKS, issuer, audience, allowed algorithm, expiration, and client ID.
   Read the external identity from `(iss, sub)`; never trust `X-User-Id`, email, or a client-
   supplied local user ID. Anonymous routes require `@Public()`.

9. **Authorise with permissions, not role names.** Controllers declare permissions such as
   `invoices:read`; the guard checks OAuth scopes. Ownership, tenant, branch, and business-state
   checks remain in the service.

10. **Schema changes use migrations only.** `synchronize` is always `false`. An entity change and
    its migration ship together. Read generated `up()` and `down()` SQL before committing.
    Application startup never runs migrations or seeds.

11. **OpenAPI and Bruno are part of every route change.** Every HTTP endpoint has OpenAPI request,
    response, auth, status, and error metadata plus a committed Bruno request with realistic fake
    data and assertions. Bruno is manual executable documentation; it is not run in CI and does
    not replace automated tests.

12. **Handle errors through the shared filter.** Use stable machine codes and safe English
    messages. Field errors are structured. Never leak raw TypeORM/Axios errors, stack traces,
    secrets, tokens, cookies, headers, or upstream response bodies.

13. **No hidden module resolution.** Use relative imports with full file paths. Named exports
    only. No `index.ts` barrels and no TypeScript path aliases.

14. **Environment access is centralised.** Only `src/config/` reads `process.env`. Validate all
    configuration at startup. Required secrets have no fallback.

15. **External HTTP belongs in `clients/`.** Use `@nestjs/axios` there only. Every call has a
    timeout, forwards the request ID, validates the response, and maps failures. Controllers and
    services never import Axios or `HttpService` directly.

---

## Default module shape

```text
src/modules/invoicing/
├── invoicing.module.ts
├── controllers/
│   └── invoice.controller.ts
├── services/
│   └── invoicing.service.ts
├── repositories/
│   └── invoice.repository.ts
├── entities/
│   ├── invoice.entity.ts
│   └── invoice-line.entity.ts
├── dto/
│   ├── create-invoice.dto.ts
│   ├── update-invoice.dto.ts
│   └── invoice-response.dto.ts
└── clients/                         # optional; create only when needed
    └── tax-service.client.ts
```

New code starts inside its owning module. Shared Nest building blocks move to `common/` only when
two modules already need them. Do not create `utils/`, `helpers/`, or `shared/` junk drawers.

---

## TypeScript and naming

- Files and folders: `kebab-case`.
- Classes and types: `PascalCase`; constants: `SCREAMING_SNAKE_CASE`.
- Booleans start with `is`, `has`, or `can`.
- `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride` stay enabled.
- No `any`; narrow `unknown`.
- No TypeScript `enum`; use a const object plus a union.
- No non-null assertion in logic. Definite-assignment `!` is allowed only on decorated DTO and
  entity properties.
- One primary exported class per file. Colocated service input types are allowed.

---

## HTTP and data defaults

- Prefix and version: `/api/v1`; health routes are version-neutral.
- Resource paths are plural kebab-case nouns. Business commands use
  `POST /resources/:id/<action>`.
- Page pagination uses `page` (default `1`) and `limit` (default `20`, max `100`). Sort and filter
  fields are allowlisted.
- Business entity IDs are UUIDs.
- Timestamps are ISO 8601 UTC over the wire and `timestamptz` in PostgreSQL. Date-only values use
  `YYYY-MM-DD` and PostgreSQL `date`.
- Money is a decimal string plus a currency code over the wire and `numeric` in PostgreSQL.
- Omitted PATCH field means "unchanged"; `null` means "clear" and is allowed only when nullable.
- Single resources have no universal `{ success, data }` envelope. Lists return `{ data, meta }`.
- Create returns `201`, update returns `200`, and delete returns `204` without a body.

---

## Before considering a change complete

Run the repository's equivalents of:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run openapi:generate
```

Do not run Bruno in CI. Run the affected Bruno requests manually when an API route changes.

When this file does not cover a choice, inspect the nearest existing example. If no pattern
exists, stop and ask. Do not add a dependency, weaken a boundary, or invent a second pattern as
part of feature work.
