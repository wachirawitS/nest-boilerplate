# NestJS Modular Monolith Backend Conventions

> **Purpose.** This document defines *how* code is written in our NestJS backend projects, so
> every contributor — human or AI — produces code that looks like it was written by one person.
>
> **Scope.** Applies to a REST API modular monolith using Node.js 24 LTS, NestJS, Express,
> PostgreSQL, and TypeORM. Nest acts as an OAuth resource server behind a BFF or another trusted
> server-side client. It does not apply to GraphQL, microservices, CQRS/event-sourced systems, or
> projects using a different database or ORM.
>
> **Status.** This is a standing rule set, not a feature specification. It is rewritten in place
> and never describes a particular product feature.

---

## 0. How to use this document

Two files ship with every repository:

| File | Audience | Content |
|---|---|---|
| `CONVENTIONS.md` | Humans and agents told to read it | This document, in full |
| `AGENTS.md` | Every coding agent, automatically | The subset violated most often |

`AGENTS.md` is a summary. When the two disagree, **this document wins**.

Rules use **must** and **must not**. A rule that permits judgement states the exact trigger for
that judgement. Rules that can be checked mechanically are backed by tooling in §20. Rules marked
👁️ **review-only** require a human reading the diff.

A feature specification decides *what* to build. This document decides *how* to build it. Never
change a convention inside a feature change merely to make the feature easier.

---

## 1. Architecture baseline

These assumptions support every rule that follows. If a project does not match them, use a
different convention rather than accumulating exceptions.

1. The application is a **REST API modular monolith**.
2. One deployable NestJS process contains multiple business modules.
3. A module represents a **business capability**, not a database table or technical layer.
4. PostgreSQL is the single relational database. TypeORM uses the Data Mapper style through
   module-owned repository classes.
5. Nest uses the Express adapter and runs on Node.js 24 LTS using CommonJS output.
6. Nest is an OAuth resource server. An external OAuth/OIDC provider issues access tokens; Nest
   verifies but does not issue them.
7. A browser does not call this API directly. A BFF retains OAuth tokens server-side and forwards
   the correct access token to Nest.
8. The baseline has no event bus, durable queue, distributed cache, GraphQL, WebSockets, or
   microservice transport.
9. The deployable artifact is a Docker image running one Nest process behind an HTTPS reverse
   proxy.

### 1.1 Why a deliberately simple modular monolith

The unit of organisation is a business capability, but each module uses familiar Nest building
blocks rather than four Clean Architecture directories or one class per use case. This retains
visible ownership without turning a straightforward CRUD flow into a chain of adapters, ports,
commands, and mappers.

The baseline is not permission to ignore boundaries. Simplicity comes from fewer abstractions,
not from letting every module reach every table.

### 1.2 Request flow

```text
Browser
  │ HttpOnly BFF session cookie
  ▼
Next.js BFF or another trusted server-side client
  │ HTTPS
  │ Authorization: Bearer <OAuth access token>
  │ X-Request-Id: <UUID>
  ▼
HTTPS reverse proxy
  ▼
NestJS /api/v1/*
  ├─ request correlation
  ├─ authentication and permission guards
  ├─ controller
  ├─ service
  └─ repository/client
```

The reverse proxy being publicly reachable does not make the API a browser API. Authentication,
network policy, and BFF routing enforce the caller boundary. CORS is not an authentication
mechanism.

---

## 2. Project structure

The top-level `src/` structure is a closed list:

```text
src/
├── main.ts
├── app.module.ts
├── modules/                         # business capabilities
├── common/                          # shared Nest building blocks, earned by reuse
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/                          # validated typed configuration
├── database/                        # DataSource, database helpers, local/test seeds
│   └── seeds/
└── migrations/                      # TypeORM migrations

test/                                # integration and HTTP e2e tests
bruno/                               # committed executable API examples
```

Do not add top-level `utils/`, `helpers/`, `shared/`, `core/`, `domain/`, `application/`, or
`infrastructure/` folders. If a real cross-cutting responsibility does not fit the closed list,
change this convention in its own discussion before adding it.

### 2.1 Default module structure

```text
src/modules/invoicing/
├── invoicing.module.ts
├── controllers/
│   └── invoice.controller.ts
├── services/
│   └── invoicing.service.ts
├── repositories/
│   ├── invoice.repository.ts
│   └── payment.repository.ts
├── entities/
│   ├── invoice.entity.ts
│   ├── invoice-line.entity.ts
│   └── payment.entity.ts
├── dto/
│   ├── create-invoice.dto.ts
│   ├── update-invoice.dto.ts
│   ├── mark-invoice-paid.dto.ts
│   └── invoice-response.dto.ts
└── clients/                         # optional; create only when this module calls an external API
    └── tax-service.client.ts
```

The standard folders have exact meanings:

| Folder | Owns | Must not own |
|---|---|---|
| `controllers/` | HTTP routes and adapters | Business rules, queries, transactions |
| `services/` | Use cases, orchestration, business rules | HTTP DTOs, SQL/QueryBuilder, Axios |
| `repositories/` | All database reads and writes | HTTP decisions, cross-module queries |
| `entities/` | TypeORM table mappings | Injected dependencies, workflows |
| `dto/` | Request and response HTTP contracts | Persistence or business workflows |
| `clients/` | External HTTP integrations | Controller logic, database access |

Do not create an empty standard folder. Create it with its first file.

### 2.2 A module is a business capability

`invoicing` may own `InvoiceEntity`, `InvoiceLineEntity`, `PaymentEntity`, and `TaxInvoiceEntity`.
Do not create `invoice-line`, `payment`, or `tax-invoice` modules solely because each has a table.

Split a module only when the candidate capability has its own lifecycle, rules, and public
operations. Technical concerns such as logging, configuration, and database connectivity are not
business modules.

### 2.3 Promotion is earned

New code starts in the module that needs it. Move a decorator, pipe, filter, guard, interceptor,
or type into `common/` only when a second module actually needs the same behaviour.

`common/` must not import from `modules/`. A shared primitive that knows about Invoice or Customer
is not shared infrastructure; it belongs to that module.

---

## 3. Module boundaries

### 3.1 The public surface of a module

A module may expose an explicitly listed service. Another module interacts with it by importing
the owning Nest module and injecting that exported service.

```ts
@Module({
  imports: [TypeOrmModule.forFeature([CustomerEntity])],
  providers: [CustomerService, CustomerRepository],
  controllers: [CustomerController],
  exports: [CustomerService],
})
export class CustomerModule {}
```

The module must not export controllers, entities, repositories, clients, `TypeOrmModule`, or every
provider for convenience.

### 3.2 Hard boundaries

Another business module must not import or inject:

- an entity;
- a repository;
- a controller or DTO;
- an external client;
- a module-private helper or service.

It may import the other module class and an explicitly exported service from their full file
paths. There are no barrel exports.

### 3.3 Cross-module references

Store a reference to another module's record as an ID property:

```ts
@Column({ name: "customer_id", type: "uuid" })
customerId!: string;
```

Do not define a TypeORM relation to an entity owned by another module. When Invoicing needs
Customer behaviour or data, it calls the exported `CustomerService`; it does not join or query the
Customer table.

A PostgreSQL foreign key across module-owned tables is allowed because this is a shared-database
modular monolith. Use `ON DELETE RESTRICT` or `NO ACTION` by default. Cascade deletion across a
module boundary is forbidden.

### 3.4 No circular dependencies

`forwardRef()` is forbidden. A dependency graph must be acyclic.

If A calls B and B calls A, stop. Determine which module owns the workflow, move orchestration to
that owner, or redraw the business boundary. Do not hide ambiguous ownership behind a Nest
workaround.

Business modules must not use `@Global()`. Global providers are limited to cross-cutting
infrastructure such as configuration and the application-wide guards/filter/interceptors.

### 3.5 Transactions do not cross modules

A service may synchronously call another module's exported service, but a database transaction
must not span module ownership. Do not pass `EntityManager`, repositories, or transaction context
across a module boundary.

If two modules need atomic writes as a normal workflow, the module boundary is probably wrong.
Analyse ownership before adding distributed or ambient transaction machinery.

---

## 4. Naming, exports, and imports

### 4.1 Naming

| Thing | Rule | Example |
|---|---|---|
| Files and folders | `kebab-case` | `invoice-response.dto.ts` |
| Business module folder | Capability name | `modules/invoicing/` |
| Nest module | `<Capability>Module` | `InvoicingModule` |
| Controller | Singular resource + `Controller` | `InvoiceController` |
| Service | Capability + `Service` | `InvoicingService` |
| Repository class | Singular entity + `Repository` | `InvoiceRepository` |
| Entity class | Singular noun + `Entity` | `InvoiceEntity` |
| Request DTO | Action + resource + `Dto` | `CreateInvoiceDto` |
| Response DTO | Resource + `ResponseDto` | `InvoiceResponseDto` |
| Types | `PascalCase`, no `I` prefix | `IssueInvoiceInput` |
| Boolean | `is` / `has` / `can` prefix | `isPaid`, `canCancel` |
| Constants | `SCREAMING_SNAKE_CASE` | `INVOICE_STATUS` |
| Database table | plural `snake_case` | `tax_invoices` |
| Database column | `snake_case` | `customer_id` |
| Constraint/index | named `snake_case` | `uq_invoices_number` |
| URL resource | plural `kebab-case` | `/tax-invoices` |
| Permission | lowercase `<resource>:<action>` | `invoices:mark-paid` |

### 4.2 Named exports only

All exports are named. Default exports are forbidden, including configuration and the TypeORM
DataSource.

One primary exported class lives in each file. A service file may additionally export small input
types used by that service. A file-local supporting type or function may remain unexported.

### 4.3 No barrel files

Do not create `index.ts` files. Import the exact file that owns a symbol. A barrel hides ownership,
encourages cycles, and makes boundary review harder.

### 4.4 Relative imports only

Use relative imports and full file paths everywhere:

```ts
import { RequestIdInterceptor } from "../../../common/interceptors/request-id.interceptor";
import { CustomerModule } from "../../customer/customer.module";
```

Do not configure TypeScript path aliases such as `@/` or `src/`. `tsc` does not rewrite them in
compiled JavaScript, which creates build-success/runtime-failure traps and extra configuration for
Nest watch mode, Jest, and TypeORM CLI.

---

## 5. HTTP bootstrap and routing

### 5.1 Global bootstrap

The application configures its HTTP boundary once in `main.ts`:

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  logger: createApplicationLogger(),
});

app.use(helmet());
app.set("trust proxy", validatedTrustProxySetting);
app.setGlobalPrefix("api");
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: "1",
});
app.useGlobalPipes(createValidationPipe());
app.enableShutdownHooks();
```

The exact proxy trust value comes from deployment configuration. Never use `true` merely to make
`req.ip` look correct; trusting arbitrary forwarding headers permits IP spoofing.

### 5.2 URI and versioning

- Normal API routes live under `/api/v1`.
- Controllers do not repeat `api` or `v1` in `@Controller()`.
- Resource paths use plural kebab-case nouns.
- Health routes are version-neutral and live at `/health/live` and `/health/ready`.
- A backward-compatible addition stays in the current version.
- A breaking API change creates a new version only when both versions must coexist.

### 5.3 Resource routes

```text
GET    /api/v1/invoices
GET    /api/v1/invoices/:id
POST   /api/v1/invoices
PATCH  /api/v1/invoices/:id
DELETE /api/v1/invoices/:id

POST   /api/v1/invoices/:id/cancel
POST   /api/v1/invoices/:id/mark-paid
POST   /api/v1/invoices/:id/payments
```

- Do not use routes such as `/getInvoices` or `/createInvoice`.
- Use `PATCH` for partial modification. Use `PUT` only when replacing the complete resource.
- A state transition is a business command; use `POST /:id/<action>` rather than allowing clients
  to patch `status` directly.
- If a command creates a genuine resource, prefer the subresource form such as `/payments`.
- Do not nest resources more than one level deep.
- A destructive action must never use `GET`.

### 5.4 Controller responsibilities

A controller may:

1. declare routes, versions, status codes, permissions, and OpenAPI metadata;
2. receive params, query, and body through DTOs or built-in pipes;
3. read the authenticated principal through `@CurrentUser()`;
4. call a service;
5. map the result to a response DTO.

A controller must not:

- inject a repository, entity manager, DataSource, or external client;
- contain business conditions or transactions;
- build or reshape database queries;
- catch an error merely to rethrow or translate what the global filter handles;
- use raw Express `Request` or `Response` when a Nest abstraction exists.

`@Req()` or `@Res()` is allowed only for streaming, file download, or cookie behaviour that Nest's
standard decorators cannot express. Add a short comment explaining the exception.

### 5.5 Success responses

Do not add a universal `{ success, data }` envelope.

| Operation | Status | Body |
|---|---:|---|
| Read one | `200` | Response DTO directly |
| Read list | `200` | `{ data, meta }` |
| Create | `201` | Created response DTO |
| Partial update | `200` | Updated response DTO |
| Delete | `204` | No body |

### 5.6 Pagination, filtering, and sorting

Page-based pagination is the default for business tables:

- `page` defaults to `1`;
- `limit` defaults to `20` and must not exceed `100`;
- invalid values fail validation rather than being silently corrected;
- filter and sort names are DTO allowlists;
- never interpolate a request-provided column name into QueryBuilder;
- cursor pagination is used only when a specification identifies a continuously changing or
  high-volume feed.

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

## 6. DTOs, validation, and serialization

### 6.1 Validation stack

Use `class-validator` and `class-transformer` through one global `ValidationPipe`:

```ts
new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});
```

Use built-in pipes such as `ParseUUIDPipe` and `ParseIntPipe` for individual route parameters.
Request values are untrusted even when the caller is a BFF.

DTO validation handles transport facts: required fields, type, length, format, and physically true
ranges. A rule that depends on stored data or business state belongs in a service.

### 6.2 Separate contracts by direction and action

```text
create-invoice.dto.ts
update-invoice.dto.ts
mark-invoice-paid.dto.ts
invoice-response.dto.ts
```

- Do not use an entity as a request or response DTO.
- Do not reuse a response DTO as a request DTO.
- Server-owned fields such as `id`, `status`, and timestamps must not appear in write DTOs.
- Use `PartialType(CreateInvoiceDto)` only when every create field is genuinely editable.
- A business command gets its own DTO when it has input.

### 6.3 Services do not import DTOs

HTTP DTOs stop at the controller boundary. A service owns its input type, colocated in the service
file so no command file is needed:

```ts
export type IssueInvoiceInput = {
  customerId: string;
  dueDate: string;
};

@Injectable()
export class InvoicingService {
  issueInvoice(input: IssueInvoiceInput): Promise<InvoiceEntity> {
    // ...
  }
}
```

Structural typing lets the controller pass a validated DTO without coupling the service to it.

### 6.4 Response DTOs are mandatory

Never return a TypeORM entity from a controller. Map explicitly:

```ts
const invoice = await this.invoicingService.findOne(id);
return InvoiceResponseDto.fromEntity(invoice);
```

The mapper may be a static method on the response DTO. It must enumerate every exposed field so a
new database column cannot silently become public.

### 6.5 Optional and nullable are different

- An omitted field in a PATCH request means "leave unchanged".
- `null` means "clear the value" and is accepted only for a nullable field.
- An empty string is not automatically converted to `null`.
- A nullable response property is emitted as `null`, not omitted as `undefined`.
- `@IsOptional()` skips both `undefined` and `null`; do not use it when omission is allowed but
  `null` is forbidden. Use an explicit conditional validator for that case.

### 6.6 Wire formats

| Value | API representation | PostgreSQL representation |
|---|---|---|
| Business entity ID | UUID string | `uuid` |
| Timestamp | ISO 8601 UTC ending in `Z` | `timestamptz` |
| Date without time | `YYYY-MM-DD` | `date` |
| Money amount | Decimal string, e.g. `"1250.50"` | `numeric(precision, scale)` |
| Currency | ISO currency code, e.g. `"THB"` | constrained `varchar` |

Do not send timezone-less datetimes or represent money with a JavaScript floating-point number.

---

## 7. Authentication and authorisation

### 7.1 Roles in the architecture

- The BFF is an OAuth confidential client and retains access/refresh tokens server-side.
- The external OAuth/OIDC provider is the authorisation server and token issuer.
- Nest is the resource server and verifies access tokens.
- Nest does not implement an OAuth authorisation server or issue login tokens in this baseline.

The BFF forwards a bearer **access token**, not an ID token and not a raw user ID header.

### 7.2 Access-token verification

Use `jose` in a custom global guard. Fetch keys through the provider's configured `jwks_uri` using
`createRemoteJWKSet()` and verify with `jwtVerify()`.

The guard must verify:

- the cryptographic signature;
- an explicit allowed signing algorithm;
- `iss` against the configured issuer;
- `aud` against the configured API audience;
- `exp` and, when present, `nbf`;
- the expected BFF `client_id`;
- a non-empty `sub`;
- the type and shape of claims before use.

Do not decode a JWT and treat the decoded object as authenticated. Do not accept `alg: none`. Do
not select an algorithm merely because the token requested it.

### 7.3 Authenticated principal

Do not assume that `sub` is the UUID of a local User. An external identity is identified by the
pair `(issuer, subject)`:

```ts
export type AuthenticatedPrincipal = {
  issuer: string;
  subject: string;
  clientId: string;
  scopes: ReadonlySet<string>;
};
```

When the product needs a local application user, the `identity` module owns a unique mapping from
`(issuer, subject)` to local `userId`. Business modules reference the local UUID, not email or an
external subject string. Email is mutable and must not be an identity key.

Never trust `X-User-Id`, a user ID in a request body, or a query parameter as the current actor.

### 7.4 Protected by default

Register authentication as an application-wide guard. A route without explicit metadata remains
protected. Anonymous routes require `@Public()`.

Do not mark an entire controller public merely because one route is public. Health endpoints are
the standard anonymous exception.

### 7.5 Permissions, not roles

Use permissions with lowercase `<resource>:<action>` names:

```ts
@RequirePermissions("invoices:read")
@Get(":id")
findOne() {}
```

The permission guard reads the OAuth `scope` claim and compares exact strings. Role-to-permission
mapping belongs to the Identity Provider. Never branch on role names such as `admin` in a
controller or service.

The permission guard answers whether the principal may attempt an operation. The service still
checks ownership, tenant/branch membership, record state, and other rules that require business
data.

If a project manages permissions locally instead, the Identity module resolves them into the same
principal representation. Do not combine token scopes and database permissions within one request
without an explicit design change.

---

## 8. Error contract

### 8.1 One response shape

The global exception filter produces this shape:

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "message": "The request contains invalid fields",
  "fieldErrors": {
    "email": [
      {
        "code": "INVALID_EMAIL",
        "message": "Email must be a valid email address"
      }
    ]
  },
  "requestId": "c9f624bc-5bca-43e6-a165-09944200471d"
}
```

`fieldErrors` is omitted when an error has no field-level meaning.

### 8.2 Stable codes and safe messages

- Client logic uses `code`, never message parsing.
- Error codes use stable `SCREAMING_SNAKE_CASE` names.
- Messages are safe English diagnostics. A BFF/frontend maps codes to the UI language.
- Unknown failures use `INTERNAL_ERROR` and do not expose the original message.
- The filter must not return a stack trace, SQL, database identifiers, Axios response bodies,
  secrets, tokens, or dependency error objects.
- Every error response includes the request ID.

### 8.3 Where errors are decided

Services may throw Nest `BadRequestException`, `NotFoundException`, and `ConflictException` with
the shared application error payload. This is an intentional simplification for a REST-only
baseline.

Controllers do not catch errors to translate them. Repositories do not throw HTTP exceptions.
External clients translate upstream transport failures to a small safe application vocabulary,
normally `502` or `504`.

Expected 4xx failures are logged at `warn`; unexpected 5xx failures are logged at `error` with the
internal stack.

### 8.4 Database failures

Repository methods return `Entity | null` for absence. The service decides whether absence means
404, an empty result, or another business outcome.

For expected PostgreSQL constraint failures, use a shared classifier in `database/` that checks
the driver error code and named constraint. Never match human-readable database error strings.
The service maps a known failure to a stable conflict code; an unknown failure reaches the global
filter and becomes a sanitized 500.

---

## 9. Services and business logic

### 9.1 Service granularity

Start with one `<module>.service.ts` for the module capability. Methods are named after use cases:

```ts
issueInvoice()
markAsPaid()
cancelInvoice()
```

Do not create `CreateInvoiceUseCase`, `UpdateInvoiceUseCase`, or a similar class per action. Split
a second service when it owns a genuinely separate responsibility inside the capability, such as
`TaxInvoiceService`.

Do not create generic `BaseService` or `CrudService` abstractions. Business operations diverge;
forcing them through generic lifecycle hooks hides the rules reviewers need to see.

### 9.2 Service responsibilities

A service:

- coordinates one use case;
- checks business rules and resource-level authorisation;
- calls module-owned repositories and clients;
- calls another module only through an exported service;
- chooses the transaction boundary;
- returns entities or application result types to its controller, which maps the HTTP response.

A service must not:

- import from its module's `dto/` or `controllers/`;
- construct HTTP response envelopes;
- use QueryBuilder or TypeORM `Repository<Entity>`;
- call Axios/`HttpService` directly;
- start a transaction around an external HTTP call.

### 9.3 Entities are persistence models

TypeORM entities map database structure. Business state transitions live in services. Entities do
not inject dependencies, throw Nest HTTP exceptions, or run workflows from TypeORM hooks.

TypeORM listeners/subscribers are not a hidden business event system. Use them only for a clearly
technical concern that cannot be expressed more visibly, and mark the use 👁️ review-only.

---

## 10. Persistence

### 10.1 Entity rules

Business entities use UUID primary keys:

```ts
@Entity({ name: "invoices" })
export class InvoiceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
```

Explicitly name tables and columns in decorators. Do not depend on a naming-strategy package to
silently convert identifiers.

Do not extend TypeORM `BaseEntity`; Active Record methods bypass the repository boundary. Do not
create a shared application base entity. Repeating `id`, `createdAt`, and `updatedAt` keeps the
schema visible in each file.

Add `deletedAt` only when a product requirement needs restoration or deletion history. Soft delete
is not the default; it complicates uniqueness, queries, and relationships.

### 10.2 Status and type columns

TypeScript enums and PostgreSQL enum types are forbidden in the baseline. Use a const object plus
a union in TypeScript, and a named `CHECK` constraint over `varchar` in PostgreSQL:

```ts
export const INVOICE_STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];
```

```sql
CONSTRAINT "chk_invoices_status"
CHECK ("status" IN ('draft', 'issued', 'paid', 'cancelled'))
```

### 10.3 Relations

- TypeORM relations are allowed only between entities owned by the same module.
- `eager: true` is forbidden.
- Lazy `Promise<Entity>` relations are forbidden.
- Cascades are off by default.
- A repository explicitly selects or joins the relations needed by a query.
- A query must not run inside a loop; batch or join to prevent N+1 behaviour.
- Cross-module references are UUID columns, optionally protected by a PostgreSQL foreign key, but
  never represented as cross-module TypeORM relations.

### 10.4 Repository classes

Services inject module-owned repository classes. Only `repositories/` may inject or obtain a
TypeORM `Repository<Entity>`, build QueryBuilder expressions, or execute raw SQL.

```ts
@Injectable()
export class InvoiceRepository {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly repository: Repository<InvoiceEntity>,
  ) {}

  findById(
    id: string,
    manager?: EntityManager,
  ): Promise<InvoiceEntity | null> {
    const repository = manager
      ? manager.getRepository(InvoiceEntity)
      : this.repository;

    return repository.findOne({ where: { id } });
  }
}
```

Repository methods express intent such as `findOverdue()` or `findPayableByCustomerId()`. Do not
return QueryBuilder to a service. Do not create a repository interface for every class: TypeORM is
already an accepted dependency and Nest can mock the concrete provider in tests.

Generic `BaseRepository` is forbidden.

### 10.5 Raw SQL

Prefer TypeORM repository APIs and QueryBuilder. Raw SQL is allowed inside a repository only when
it is materially clearer or enables a PostgreSQL feature TypeORM cannot express. Parameters must
be bound; string interpolation with request or business values is forbidden.

Leave a short comment explaining why raw SQL is necessary and cover it with a PostgreSQL
integration test.

---

## 11. Transactions and concurrency

### 11.1 When to open a transaction

Do not wrap every write in an explicit transaction.

- A single database statement does not need a service-level transaction.
- A multi-write use case whose writes must succeed or fail together uses an explicit transaction.
- Normal reads do not open a transaction.
- A transaction remains inside one business module.

### 11.2 Transaction pattern

Use TypeORM's callback API:

```ts
return this.dataSource.transaction(async (manager) => {
  const invoice = await this.invoiceRepository.findById(id, manager);
  if (!invoice) {
    throw invoiceNotFound(id);
  }

  invoice.status = INVOICE_STATUS.PAID;
  await this.invoiceRepository.save(invoice, manager);
  await this.paymentRepository.create(payment, manager);

  return invoice;
});
```

Every repository call inside the callback must receive the provided manager. Using the global
repository within the callback silently executes work outside the transaction.

The service may inject `DataSource` solely to establish the transaction boundary. It must not use
the DataSource or manager to query/save entities directly.

`QueryRunner` is forbidden in normal application code. It is allowed only when a use case truly
needs manual connection/transaction lifecycle; the code must connect, commit or roll back, and
release in `finally`, with a comment explaining why the callback API is insufficient.

### 11.3 Keep transactions short

Do not perform any of these inside a transaction:

- an external HTTP request;
- email or file transfer;
- long CPU work;
- an unbounded loop;
- a cross-module write.

### 11.4 Concurrency and invariants

A pre-check followed by a write is not sufficient under concurrency.

- Use `NOT NULL`, `UNIQUE`, named `CHECK` constraints, and foreign keys for invariants PostgreSQL
  can enforce.
- Use an atomic conditional update for a simple state transition.
- Use a short transaction and row lock for a read-dependent multi-write workflow.
- Check the affected-row count and return the correct conflict when another request won the race.
- Add optimistic versioning only when a use case requires clients to detect stale updates; do not
  add a version column to every entity.

---

## 12. External HTTP clients

### 12.1 Location and dependency

When a module calls an external API, create `clients/` in that module and use
`@nestjs/axios` + `axios`. Controllers and services must not import Axios or `HttpService`.

Configure `HttpModule.registerAsync()` from typed configuration. Each distinct upstream receives
an explicit base URL and timeout.

### 12.2 Promise API

Use `HttpService.axiosRef` inside the client so RxJS `Observable` does not escape into business
code:

```ts
@Injectable()
export class PaymentGatewayClient {
  constructor(private readonly httpService: HttpService) {}

  async createPayment(
    input: CreateGatewayPaymentInput,
  ): Promise<GatewayPaymentResult> {
    const response = await this.httpService.axiosRef.post<unknown>(
      "/payments",
      input,
    );

    return this.parseResponse(response.data);
  }
}
```

The client returns an application-owned type, never `AxiosResponse` or an upstream DTO.

### 12.3 Boundary rules

- Every call has a finite timeout.
- Forward the current `X-Request-Id`.
- Treat response data as `unknown` and validate it before use.
- The configured base URL owns the host. Never accept a user-provided absolute URL.
- Map timeouts to `504` and unavailable/invalid upstream responses to a stable `502` error.
- Do not log credentials, headers, or raw upstream bodies.
- Do not automatically retry mutations. Retry only when the upstream operation is idempotent or
  uses a supported idempotency key.
- Never make an external call inside a database transaction.

---

## 13. Configuration

Use `@nestjs/config`. Only files under `src/config/` may read `process.env`.

Configuration is validated and converted at startup. Missing or malformed required values stop
the process before it begins accepting traffic. Required secrets must not have development or
empty-string fallbacks.

Separate configuration by concern:

```text
src/config/
├── app.config.ts
├── auth.config.ts
├── database.config.ts
└── validate-environment.ts
```

Business modules inject typed configuration through `ConfigType<typeof someConfig>`. Do not call
untyped `configService.get("SOME_KEY")` throughout the codebase.

The application and TypeORM CLI import the same validation and database configuration. Do not
implement a second environment parser for migrations.

Commit `.env.example` with names and non-secret examples. Never commit `.env`, access tokens,
refresh tokens, signing material, passwords, or production URLs containing credentials.

---

## 14. Observability, health, and HTTP hardening

### 14.1 Logging

Use Nest's built-in `ConsoleLogger` in the baseline.

- Production emits single-line structured JSON.
- Development uses readable text.
- A service logs meaningful business events and failures, not every method entry and exit.
- Include stable identifiers as structured fields rather than interpolating them into prose.
- Never log bearer tokens, cookies, passwords, secrets, request/response headers, complete request
  bodies, or unfiltered upstream bodies.

Add Pino, Winston, or a hosted observability SDK only when a concrete transport, performance, or
tracing requirement justifies it.

### 14.2 Request correlation

The BFF sends `X-Request-Id`. Accept it only when it is a valid UUID; otherwise generate a new
UUID. Return the chosen ID in the response header.

A global interceptor logs one completion record containing:

- `requestId`;
- HTTP method and normalised route;
- status code;
- duration in milliseconds;
- authenticated external subject and local user ID when available, without other personal data.

The exception filter includes the same request ID in error responses.

### 14.3 Health endpoints

Provide two version-neutral anonymous endpoints:

| Endpoint | Meaning | Checks |
|---|---|---|
| `GET /health/live` | Process can answer | No dependency queries |
| `GET /health/ready` | Process may receive traffic | PostgreSQL connectivity/readiness |

Health responses must not expose hostnames, SQL, credentials, internal topology, or exception
details. Register graceful shutdown hooks so the process stops receiving work and closes its
database pool on `SIGTERM`.

The baseline does not require `@nestjs/terminus`; implement the two small checks directly.

### 14.4 Nest HTTP hardening

- Register `helmet()` before routes.
- CORS is disabled because the browser does not call Nest directly. Enabling it later requires an
  exact origin allowlist; `*` is forbidden for credentialed APIs.
- Limit normal JSON request bodies to 1 MB. File-upload endpoints define separate explicit limits.
- Authentication and permission guards are global.
- Configure Express `trust proxy` for the exact reverse-proxy topology.
- Nest uses bearer authentication, not cookies, so CSRF middleware belongs at the BFF rather than
  this API.

### 14.5 Reverse-proxy responsibilities

The reverse proxy terminates TLS, enforces connection/request timeouts and body limits, and owns
the primary rate limit. It may allowlist static Vercel egress IPs when available, but network
allowlisting never replaces OAuth authentication.

`@nestjs/throttler` is not part of the baseline. Its in-memory state is inconsistent across
multiple processes; introduce shared rate-limit storage only when the proxy cannot meet the
requirement.

---

## 15. OpenAPI and Bruno

OpenAPI and a committed Bruno collection are mandatory for every controller route, including
authenticated routes and health endpoints.

### 15.1 OpenAPI is the machine-readable contract

Use `@nestjs/swagger` and derive request/response schemas from DTO classes. Every route declares:

- operation summary and tags;
- authentication and required permission where applicable;
- path/query/body schemas;
- success status and response DTO;
- relevant shared error responses.

The global error shape is declared once and reused. Swagger UI is enabled in development. In
production it is disabled or placed behind authentication; it must not become an accidental public
catalogue.

`npm run openapi:generate` must construct the application and write a document successfully in CI.
The generated JSON need not be committed unless deployment or a consumer needs the artifact.

### 15.2 Bruno is executable documentation

The collection is plain text committed beside the code:

```text
bruno/
├── bruno.json
├── environments/
│   └── local.bru
├── health/
│   ├── get-live.bru
│   └── get-ready.bru
└── invoicing/
    ├── create-invoice.bru
    ├── list-invoices.bru
    ├── get-invoice.bru
    ├── mark-invoice-paid.bru
    └── create-invoice-invalid.bru
```

- Folders mirror business modules.
- Every route has at least one happy-path request.
- A mutation has at least one meaningful validation/error example.
- Payloads use realistic fake data, never production data or personal data.
- Every request asserts at least the status and essential response shape.
- A create request may save its returned ID as a runtime variable for later requests.
- `baseUrl` lives in an environment file.
- Access tokens come from `{{process.env.ACCESS_TOKEN}}` or a local uncommitted `.env` file.
- Commit `.env.sample`; ignore `.env`.
- When a route changes, update its DTO, OpenAPI metadata, and Bruno request in the same change.

Example request:

```text
meta {
  name: Create invoice
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/v1/invoices
  body: json
  auth: bearer
}

auth:bearer {
  token: {{process.env.ACCESS_TOKEN}}
}

body:json {
  {
    "customerId": "48f4f94b-d0d4-43fa-a376-516e58de50a5",
    "dueDate": "2026-09-30",
    "currency": "THB"
  }
}

assert {
  res.status: eq 201
  res.body.id: isString
}
```

Bruno is run manually. It is not part of CI and does not replace Jest/Supertest tests. Do not
regenerate the collection from OpenAPI on every build; doing so would overwrite curated example
data, assertions, and workflows. OpenAPI import is acceptable only as an initial bootstrap.

---

## 16. Testing and seeds

### 16.1 Test layers

| Test | Location | Purpose |
|---|---|---|
| Service unit | Colocated `*.spec.ts` | Business rules, authorisation, error paths |
| Repository integration | `test/` | Custom queries and PostgreSQL behaviour |
| HTTP e2e | `test/` | Guards, validation, status, response shape, critical workflows |

Do not test getters, decorators, DTO annotations, or module wiring with no behaviour. Coverage is a
signal, not a target; 100% line coverage is not required. Critical positive and negative behaviour
is required.

Mock module repository and client classes in service unit tests. Repository integration tests use
real PostgreSQL, not SQLite or an in-memory substitute with different SQL semantics.

### 16.2 Test isolation

- Tests must not depend on execution order.
- A test creates the business records it needs.
- Integration/e2e tests use a disposable database.
- No test points to development, staging, or production.
- Parallel workers must not mutate the same fixtures without isolation.
- Time-dependent tests inject or pass time rather than sleeping.

### 16.3 Deterministic local/test seeds

Provide `npm run seed` under `src/database/seeds/`.

- Seeds run only in local/test environments and fail closed elsewhere.
- Seeds are idempotent.
- Use deterministic UUIDs and realistic fake data.
- Seed reference data useful to Bruno, such as permissions or lookup values.
- Do not use production exports or real personal information.
- Application startup never runs seeds automatically.
- Tests still own their fixtures; they do not assume a prior developer seed run.

---

## 17. Asynchronous work, caching, and idempotency

### 17.1 No queue or event bus by default

Cross-module coordination uses exported services synchronously. Do not install an event emitter,
Redis queue, RabbitMQ, or another broker pre-emptively.

In-process events must not carry work that cannot be lost: a restart loses the event. When work
must retry, schedule, or survive a process restart, add a durable queue. When a database write and
event publication must be consistent, use a transactional outbox. The queue/broker choice is a
separate architecture decision.

### 17.2 No cache by default

Query PostgreSQL directly and add indexes based on real query patterns. TypeORM global query cache
and Redis are not in the baseline.

Before adding a cache, measure the bottleneck and define owner, key format, TTL, invalidation,
permission isolation, and behaviour when the cache is unavailable. A cache is never the source of
truth.

### 17.3 Idempotency for critical side effects

Do not require `Idempotency-Key` for every POST. Require it when retrying could duplicate a
financial, external, or otherwise costly side effect.

- Scope a key by authenticated principal and operation.
- Store the request payload hash and result.
- The same key and payload returns the same result.
- The same key with a different payload returns `409`.
- Write the idempotency record in the same transaction as the business change.
- A BFF retry forwards the original key; it does not generate a new key per attempt.

---

## 18. Dependencies and runtime

### 18.1 Approved runtime dependencies

The baseline set is:

```text
@nestjs/common
@nestjs/core
@nestjs/platform-express
@nestjs/config
@nestjs/typeorm
@nestjs/swagger
@nestjs/axios
typeorm
pg
class-validator
class-transformer
jose
axios
helmet
reflect-metadata
rxjs
```

Approved development/tooling packages are:

```text
@nestjs/cli
@nestjs/testing
@usebruno/cli
typescript
eslint
prettier
jest
supertest
eslint-plugin-import
eslint-plugin-check-file
```

Transitive/type packages required by this stack are allowed. A new direct dependency requires a
discussion and an update to this list in a convention-only change.

Do not add Passport, Pino/Winston, Lodash, a retry package, a date library, Redis, or a message
broker without a real requirement.

### 18.2 npm and lockfile

Use npm, declare the package-manager version in `package.json`, and commit `package-lock.json`.
CI and Docker builds use `npm ci`; they do not regenerate dependency resolution.

### 18.3 Node and module system

Use Node.js 24 LTS and CommonJS output:

```jsonc
{
  "engines": {
    "node": ">=24 <25"
  }
}
```

```jsonc
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2023"
  }
}
```

`jose` v6 is ESM, but supported Node 24 releases can load ESM from CommonJS. Do not downgrade the
security library or introduce a second JWT implementation to support an obsolete Node runtime.

---

## 19. Docker and deployment

Docker is the standard deployable artifact, including on a personally managed server.

### 19.1 Image rules

- Use a multi-stage Dockerfile.
- Use a Node 24 LTS Debian slim base rather than an unpinned `latest` tag.
- Install from the lockfile with `npm ci`.
- The runtime stage contains compiled output and production dependencies only.
- Run as a non-root user.
- Do not copy `.env`, test output, source-control metadata, or local Bruno secrets.
- One container runs one Nest process. Do not run PM2 inside the container.
- Receive `SIGTERM` directly and shut down gracefully.
- Inject configuration and secrets at runtime; never bake them into an image layer.

### 19.2 Database lifecycle

Run migrations as an explicit deployment step before directing traffic to the new version.
Application startup must not run migrations or seeds. `synchronize`, `dropSchema`, and automatic
test fixture loading are false in deployed configuration.

### 19.3 Reverse proxy

The reverse proxy owns TLS and forwards only to the container's private port. Configure request
size, timeout, trusted forwarding headers, and health checks consistently with §14.

---

## 20. TypeScript and enforcement

### 20.1 TypeScript

Required compiler settings include:

```jsonc
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2023",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "outDir": "./dist",
    "sourceMap": true,
    "skipLibCheck": true,
    "types": ["node", "jest"]
  }
}
```

Rules:

- No `any`. Receive unknown data as `unknown` and narrow or validate it.
- Use `type` by default. Use `interface` only for declaration merging or an external API that
  specifically requires it.
- No TypeScript `enum`; use const objects and union types.
- No non-null assertion in application logic.
- Definite-assignment `!` is allowed only on decorated properties in `dto/` and `entities/`, where
  class-transformer or TypeORM assigns values.
- Do not disable `strictPropertyInitialization` globally to avoid those explicit markers.

### 20.2 ESLint intent

Use flat ESLint configuration and enforce at least:

- kebab-case source files and folders;
- no `index.ts` barrels;
- named exports only;
- no explicit `any` or TypeScript enums;
- no non-null assertion outside DTO/entity overrides;
- no `process.env` outside `src/config/`;
- no `forwardRef()` calls;
- controllers cannot import repository/entity/client/database internals;
- services cannot import controllers or DTOs;
- repositories cannot import controllers or services;
- controllers/services cannot import TypeORM query primitives except the service allowance for
  `DataSource` and `EntityManager` transaction plumbing;
- cross-module imports cannot target another module's controller, repository, entity, DTO, client,
  or private service.

Relative cross-module paths make some ownership checks awkward for simple string-pattern rules.
Combine ESLint zones/patterns with the review-only checks below; do not pretend an incomplete rule
fully enforces the boundary.

### 20.3 Example restriction fragments

Verify rule/plugin option shapes against the installed major versions.

```js
export default [
  {
    files: ["src/**/*.ts"],
    rules: {
      "import/no-default-export": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use a const object plus a union type.",
        },
        {
          selector: "CallExpression[callee.name='forwardRef']",
          message: "Analyse the business boundary; forwardRef() is forbidden.",
        },
      ],
    },
  },
  {
    files: ["src/modules/*/{dto,entities}/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/config/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Read environment variables only under src/config/.",
        },
      ],
    },
  },
  {
    files: ["src/modules/*/controllers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "../repositories/*",
            "../entities/*",
            "../clients/*",
            "../../*/repositories/*",
            "../../*/entities/*",
            "../../*/clients/*",
            "../../*/controllers/*",
            "../../*/dto/*",
          ],
          paths: [
            {
              name: "typeorm",
              message: "Controllers must not access persistence APIs.",
            },
            {
              name: "@nestjs/axios",
              message: "Axios belongs in module clients/.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/*/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["../dto/*", "../controllers/*"],
          paths: [
            {
              name: "@nestjs/axios",
              message: "Axios belongs in module clients/.",
            },
          ],
        },
      ],
    },
  },
];
```

The project must complete the filename/folder rules with `eslint-plugin-check-file` and adapt
relative boundary patterns to its exact depth. A rule that is present but cannot catch the paths
the project uses is a broken rule.

### 20.4 CI

Every pull request must pass:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run openapi:generate
```

Bruno is deliberately not run in CI. Run affected requests manually for an API change.

### 20.5 Review-only checks

Machines do not reliably decide these. Review every change for:

- whether a proposed module is a capability or merely a table;
- whether another module's internal type was imported through an unusual relative path;
- whether business logic leaked into a controller, repository, entity hook, or DTO;
- whether a service is becoming a god class and now owns distinct responsibilities;
- whether a transaction forgot to pass its manager to every repository call;
- whether a transaction wraps external or slow work;
- whether a pre-check is race-safe;
- whether response mapping exposes a new field;
- whether logs or errors reveal personal or secret data;
- whether OpenAPI and Bruno examples changed with the route;
- whether an unapproved dependency or a second pattern appeared quietly.

---

## 21. When this document does not cover something

1. **Stop and ask. Do not invent a pattern.**
2. Look for the nearest existing example and follow it when it complies with this document.
3. Do not add a dependency without updating the approved list in a separate convention change.
4. Do not weaken module boundaries, validation, authentication, or error sanitisation to finish a
   feature faster.
5. A specification determines product behaviour; this document determines implementation shape.
   Raise contradictions rather than resolving them silently.
6. Never change this document as part of an unrelated feature pull request.

The intended result is not maximal architecture. It is a codebase with one predictable place for
every responsibility, explicit business ownership, and enough mechanical enforcement that the
rules survive both human and AI contributions.
