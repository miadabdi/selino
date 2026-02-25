# Docker Setup for Selino

This document describes how to run Selino using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose V2

## Quick Start

### Initial Setup

```bash
# Copy the environment file
cp .env.example .env

# Edit .env with your configuration (optional, defaults work for development)
nano .env
```

### Development Mode

```bash
# Start full development stack (app + infra)
npm run docker:up
# or:
# docker compose -f docker-compose.base.yml -f docker-compose.yml up -d

# View logs
npm run docker:logs
# or:
# docker compose -f docker-compose.base.yml -f docker-compose.yml logs -f app

# Stop all services
npm run docker:down
# or:
# docker compose -f docker-compose.base.yml -f docker-compose.yml down
```

### Database Only (for local development)

```bash
# Start only infrastructure services you need
docker compose -f docker-compose.base.yml up -d db rmq seaweed_s3

# Run the app locally
npm run start:dev
```

### Test Environment

```bash
# Start test database (db_test profile service)
docker compose -f docker-compose.base.yml --profile test up -d db_test

# Run tests
npm run test:e2e
```

## Services

### PostgreSQL Database

- **Image**: postgres:18.1-bookworm
- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Default Credentials**:
  - Database: `selino`
  - User: `selino_user`
  - Password: `selino_pass`

**Connection String**: `postgresql://selino_user:selino_pass@localhost:5432/selino`

### RabbitMQ

- **Image**: rabbitmq:3.13-management-alpine
- **Ports**:
  - AMQP: 5672 (configurable via `RABBITMQ_PORT`)
  - Management UI: 15672 (configurable via `RABBITMQ_CONSOLE_PORT`)
- **Default Credentials**:
  - User: `selino_rmq`
  - Password: `selino_rmq_pass`

**Management UI**: http://localhost:15672
**Connection URI**: `amqp://selino_rmq:selino_rmq_pass@localhost:5672`

### SeaweedFS

- **Image**: chrislusf/seaweedfs:4.13
- **Services**:
  - `seaweed_master` on `9333` (`SEAWEED_MASTER_PORT`)
  - `seaweed_volume` on `8080` (`SEAWEED_VOLUME_PORT`)
  - `seaweed_filer` on `8888` + gRPC `18888` (`SEAWEED_FILER_PORT`, `SEAWEED_FILER_GRPC_PORT`)
  - `seaweed_s3` on `8333` (`SEAWEED_S3_PORT`)
- **S3 Credentials**:
  - `SEAWEED_ACCESS_KEY_ID`
  - `SEAWEED_SECRET_ACCESS_KEY`

### Application Container

- **Port**: 3000 (configurable via `PORT`)
- **Debug Port**: 9229 (for Node.js debugging)
- **Auto-reload**: Enabled in development mode

## Useful Commands

### Database Operations

```bash
# Run migrations
docker compose -f docker-compose.base.yml -f docker-compose.yml exec app npm run db:migrate

# Generate migrations
docker compose -f docker-compose.base.yml -f docker-compose.yml exec app npm run db:generate

# Open Drizzle Studio
docker compose -f docker-compose.base.yml -f docker-compose.yml exec app npm run db:studio

# Connect to PostgreSQL
docker compose -f docker-compose.base.yml exec db psql -U selino_user -d selino
```

### RabbitMQ Management

```bash
# View RabbitMQ logs
docker compose -f docker-compose.base.yml logs rmq

# Restart RabbitMQ
docker compose -f docker-compose.base.yml restart rmq
```

### General Maintenance

```bash
# Rebuild containers
npm run docker:rebuild
# or:
# docker compose -f docker-compose.base.yml -f docker-compose.yml build --no-cache

# Remove all containers and volumes (⚠️ deletes data)
docker compose -f docker-compose.base.yml -f docker-compose.yml down -v

# View running services
docker compose -f docker-compose.base.yml -f docker-compose.yml ps

# Execute commands in app container
docker compose -f docker-compose.base.yml -f docker-compose.yml exec app sh
```

## Environment Variables

All environment variables are defined in a single `.env` file that Docker Compose automatically reads.

**Initial Setup:**

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env
```

**Key Points:**

- Docker Compose automatically reads `.env` from the project root
- Service hostnames (like `db`, `rmq`, `seaweed_s3`) are automatically resolved inside containers
- For local development, use `localhost` in `DATABASE_URL` and `RABBITMQ_URI`
- When running the app in Docker, the compose file overrides these with service names

You can override any variable at runtime:

```bash
POSTGRES_PORT=5433 docker compose -f docker-compose.base.yml -f docker-compose.yml up -d
```

## Volumes

Docker Compose creates persistent volumes for:

- `db_data`: PostgreSQL database files
- `rmq_data`: RabbitMQ data and configuration
- `seaweed_master_data`: SeaweedFS master metadata
- `seaweed_volume_data`: SeaweedFS volume data
- `seaweed_filer_data`: SeaweedFS filer metadata/data
- `node_modules`: app container dependencies

To completely reset:

```bash
docker compose -f docker-compose.base.yml -f docker-compose.yml down -v
```

## Networking

All services run on a dedicated bridge network called `selino_network`. Services can communicate using their service names (e.g., `db`, `rmq`, `app`).

## Profiles

Docker Compose uses profiles to manage different environments:

- `test`: Enables `db_test` (separate test PostgreSQL on `POSTGRES_TEST_PORT`, default `5433`)

The development stack is managed by combining:

- `docker-compose.base.yml` (infrastructure)
- `docker-compose.yml` (development app container)

## Troubleshooting

### Port Already in Use

If you get a port conflict, change the ports in `.env`:

```bash
POSTGRES_PORT=5433
RABBITMQ_PORT=5673
RABBITMQ_CONSOLE_PORT=15673
```

### Container Won't Start

Check logs:

```bash
docker compose -f docker-compose.base.yml -f docker-compose.yml logs <service-name>
```

### Database Connection Issues

Ensure the service is healthy:

```bash
docker compose -f docker-compose.base.yml -f docker-compose.yml ps
```

`db`, `rmq`, and SeaweedFS services expose healthchecks. The app container waits for healthy dependencies via `depends_on` conditions.

### Docker Build Fails on `husky` During `npm ci --omit=dev`

In production image builds, `npm ci --omit=dev` still runs lifecycle scripts like `prepare`, but `husky` is a dev dependency and is not installed in that stage.

This project uses a guarded `prepare` script in [package.json](package.json) so production-only installs do not fail when `husky` is unavailable.

### Reset Everything

```bash
docker compose -f docker-compose.base.yml -f docker-compose.yml down -v
docker compose -f docker-compose.base.yml -f docker-compose.yml build --no-cache
docker compose -f docker-compose.base.yml -f docker-compose.yml up -d
```

## Production Deployment

For production, create a `.env.production` file with production values and use the production target:

```bash
docker build --target production -t selino:latest .
docker run -p 3000:3000 --env-file .env.production selino:latest
```

Or with Docker Compose:

```bash
# Use a production environment file
cp .env.example .env.production
# Edit .env.production with production values
DOCKER_USERNAME=<your-dockerhub-username> IMAGE_TAG=<image-tag> \
docker compose -f docker-compose.base.yml -f docker-compose-prod.yml --env-file .env.production up -d
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [RabbitMQ Docker Hub](https://hub.docker.com/_/rabbitmq)
- [SeaweedFS GitHub](https://github.com/seaweedfs/seaweedfs)
