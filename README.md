# Selino Backend

NestJS 11 backend for a multi-store commerce workflow with OTP auth, inventory management, purchase requests, invoicing, file storage, and async notifications.

## Tech Stack

- Node.js 24.x
- NestJS 11 + TypeScript
- PostgreSQL + Drizzle ORM
- RabbitMQ (`@golevelup/nestjs-rabbitmq`)
- S3-compatible object storage (AWS S3 / MinIO / SeaweedFS S3)
- Swagger OpenAPI (`/api/docs`)
- Jest + ESLint + Prettier

## What This Service Does

- Auth
- Phone OTP login
- Email verification OTP
- Google OAuth login
- JWT access tokens + rotating refresh tokens

- Commerce domains
- Stores and store members (owner/manager/seller/gatherer)
- Product catalog (brands, categories, specs, images)
- Store inventory with reservation and transaction logging
- Purchase request cart flow (active/confirm/cancel/expire)
- Invoice and invoice-item creation on confirmation

- Files and media
- Presigned upload intents
- Upload confirmation lifecycle (`pending -> ready -> failed`)
- Server-side uploads for product/store/profile images

- Notifications
- SMS/email notification jobs via RabbitMQ
- Provider abstraction (console, Kavenegar, SMS.ir, SMTP)
- Delivery status tracking

## Project Structure

```text
src/
  auth/                OTP, Google OAuth, JWT, refresh token rotation, CASL abilities
  users/               profile and profile image updates
  stores/              store CRUD + member management
  categories/          category tree + category spec schema
  brands/              brand CRUD
  products/            product CRUD, spec validation, product images
  inventories/         per-store inventory + stock transactions
  purchase-requests/   cart/checkout flow + invoice generation + expiry worker
  files/               upload-intent/confirm/delete + URL resolution
  storage/             S3-compatible storage provider + bucket bootstrap
  notification/        async notification producer/consumer/channels/providers
  otp/                 OTP creation/verification
  database/            Drizzle module, schema, relations, migration runner
  rabbitmq/            global RabbitMQ module
```

## Runtime Behavior (High Level)

- All DTOs are globally validated (`whitelist`, `forbidNonWhitelisted`, `transform`).
- Errors are normalized by `HttpErrorFilter` to `{ error, field? }` shape.
- Swagger docs are available at `GET /api/docs`.
- `GET /health` returns service health.

## Authorization Model

- Authentication: JWT bearer (`JwtAuthGuard`)
- Enriched user context for most protected routes: `UserEnrichmentGuard`
- Authorization rules: CASL ability factory (`Auth/casl`)

Current ability rules:

- `isAdmin = true`: `manage all`
- Store managing roles (`owner`, `manager`, `seller`):
  - `create Brand`
  - `create Product`
  - `update Product`
- Managing any store grants inventory permissions scoped by `storeId`:
  - `create Inventory` where `storeId` in managed stores
  - `update Inventory` where `storeId` in managed stores
- Purchase request updates allowed for requester only (`requesterId = user.id`)

## API Surface

All route definitions below are from current controllers.

### App

- `GET /`
- `GET /health`

### Auth

- `POST /auth/otp/send`
- `POST /auth/otp/verify`
- `POST /auth/email/send` (auth)
- `POST /auth/email/verify` (auth)
- `GET /auth/google`
- `GET /auth/google/callback`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all` (auth)

### Users

- `PUT /users/me` (auth, multipart `profilePicture`)
- `GET /users/me` (auth)

### Stores

- `POST /stores` (auth, multipart `logo`)
- `GET /stores/:id` (auth)
- `PATCH /stores/:id` (auth, multipart `logo`)
- `DELETE /stores/:id` (auth)
- `POST /stores/:id/members` (auth)
- `DELETE /stores/:id/members/:userId` (auth)

### Categories

- `GET /categories` (auth)
- `POST /categories` (auth)
- `PATCH /categories/:id` (auth)
- `GET /categories/:id/spec-schema` (auth)
- `PUT /categories/:id/spec-schema` (auth)

### Brands

- `GET /brands` (auth)
- `POST /brands` (auth)
- `PATCH /brands/:id` (auth)

### Products

- `GET /products` (auth)
- `POST /products` (auth, multipart `pictures[]`)
- `GET /products/:id` (auth)
- `PATCH /products/:id` (auth, multipart `pictures[]`)
- `DELETE /products/:id` (auth)
- `POST /products/:id/images` (auth)
- `PATCH /products/:id/images/reorder` (auth)

### Store Inventory

- `POST /stores/:storeId/inventory` (auth)
- `PATCH /stores/:storeId/inventory/:id/restock` (auth)
- `GET /stores/:storeId/inventory` (auth)
- `PATCH /stores/:storeId/inventory/:id` (auth)
- `GET /stores/:storeId/inventory/:id/transactions` (auth)

### Purchase Requests

- `POST /purchase-requests/items` (auth)
- `DELETE /purchase-requests/items/:itemId` (auth)
- `GET /purchase-requests/active` (auth)
- `POST /purchase-requests/:id/confirm` (auth)
- `POST /purchase-requests/:id/cancel` (auth)

### Files

- `POST /files/upload-intent`
- `POST /files/:id/confirm`
- `DELETE /files/:id`

## File Upload Lifecycle

For client-direct uploads:

1. Call `POST /files/upload-intent` with bucket key + metadata.
2. Upload file directly to returned presigned URL.
3. Call `POST /files/:id/confirm`.
4. Use file ID in domain entities.

For server-side image uploads (users/stores/products), services use `uploadFromBuffer` directly and create `ready` records.

## Purchase Request and Stock Workflow

- Adding an item reserves stock (`reservedStock += qty`).
- Removing/cancelling/expiry releases reserved stock.
- Confirming request:
  - creates invoice + invoice items
  - consumes reserved stock (`stock -= qty`, `reservedStock -= qty`)
  - logs `sale` inventory transactions
  - marks purchase request as `confirmed`
- Background expiry worker in `PurchaseRequestsService` periodically expires stale open requests and releases reservations.

Relevant env tuning:

- `PURCHASE_REQUEST_EXPIRY_CHECK_INTERVAL_MS`
- `PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES`

## Environment Variables

Use `.env.example` as template.

```bash
cp .env.example .env
```

### Required by validation

Most settings below are required. A few (like `PORT`) have defaults but are still validated/coerced.

- App/Auth
- `PORT` (default: `3000`)
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

- Database/RabbitMQ
- `DATABASE_URL`
- `RABBITMQ_URI`

- Storage (required)
- `STORAGE_REGION`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_BUCKET_PRODUCT_MEDIA`
- `STORAGE_BUCKET_PROFILE_MEDIA`
- `STORAGE_FORCE_PATH_STYLE` (`true` for most self-hosted S3-compatible setups)
- `STORAGE_PUBLIC_URL_BASE` should be set when serving public object URLs

### Optional/conditional

- SMS provider selection: `SMS_PROVIDER=console|kavenegar|smsir`
- If `kavenegar`: `KAVENEGAR_API_KEY`, `KAVENEGAR_SENDER`
- If `smsir`: `SMSIR_API_KEY`, `SMSIR_LINE_NUMBER` (+ optional template vars)
- Email via SMTP: `SMTP_*`

## Local Development (without Docker)

Prerequisites:

- Node.js 24+
- PostgreSQL
- RabbitMQ
- S3-compatible storage endpoint/buckets (or AWS S3)

Install and run:

```bash
npm ci
npm run db:migrate
npm run start:dev
```

Swagger:

- `http://localhost:<PORT>/api/docs`

## Docker Development

Compose is split into base + environment overrides.

```bash
# full dev stack (infra + app)
npm run docker:up

# logs
npm run docker:logs

# stop
npm run docker:down
```

Files used:

- `docker-compose.base.yml`: infra (Postgres, RabbitMQ, SeaweedFS)
- `docker-compose.yml`: development app service
- `docker-compose-prod.yml`: production app service

## Database and Migrations

Drizzle schema lives in `src/database/schema/`.

```bash
# generate SQL migration from schema changes
npm run db:generate

# apply pending migrations
npm run db:migrate

# check migration state
npm run db:check

# open Drizzle Studio
npm run db:studio
```

Migration SQL files are in `drizzle/`.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

## CI/CD and Deployment

GitHub workflows:

- `run-tests.yml`: lint + unit tests + build on `main` and `dev`
- `image-builder-dev.yml`: builds/pushes development image tags
- `image-builder-stable.yml`: builds/pushes stable production image tags
- `deployment.yml`: deploys stable image to server over SSH using compose

Deployment compose command in workflow uses:

```bash
docker compose --env-file .env -f docker-compose.base.yml -f docker-compose-prod.yml up -d app
```

## Notes and Caveats

- The test suite currently only includes basic app/health tests; domain-level coverage is minimal.
- Several domain routes use service-level CASL checks (not route metadata policies).
- Public object URLs are built from `STORAGE_PUBLIC_URL_BASE`; leave it empty only if your storage integration does not rely on public URL resolution.
- `prepare` script is guarded so production `npm ci --omit=dev` does not fail on missing husky.

## License

UNLICENSED
