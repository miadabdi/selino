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
# Start all services (app, PostgreSQL, RabbitMQ)
docker compose --profile development up -d

# View logs
docker compose logs -f app

# Stop all services
docker compose --profile development down
```

### Database Only (for local development)

```bash
# Start only PostgreSQL and RabbitMQ
docker compose --profile development up -d db rmq

# Run the app locally
npm run start:dev
```

### Test Environment

```bash
# Start test services
docker compose --profile test up -d

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

### Application Container

- **Port**: 3000 (configurable via `PORT`)
- **Debug Port**: 9229 (for Node.js debugging)
- **Auto-reload**: Enabled in development mode

## Useful Commands

### Database Operations

```bash
# Run migrations
docker compose exec app npm run db:migrate

# Generate migrations
docker compose exec app npm run db:generate

# Open Drizzle Studio
docker compose exec app npm run db:studio

# Connect to PostgreSQL
docker compose exec db psql -U selino_user -d selino
```

### RabbitMQ Management

```bash
# View RabbitMQ logs
docker compose logs rmq

# Restart RabbitMQ
docker compose restart rmq
```

### General Maintenance

```bash
# Rebuild containers
docker compose build

# Remove all containers and volumes (⚠️ deletes data)
docker compose down -v

# View running services
docker compose ps

# Execute commands in app container
docker compose exec app sh
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
- Service hostnames (like `db`, `rmq`) are automatically resolved inside containers
- For local development, use `localhost` in `DATABASE_URL` and `RABBITMQ_URI`
- When running the app in Docker, the compose file overrides these with service names

You can override any variable at runtime:

```bash
POSTGRES_PORT=5433 docker compose up
```

## Volumes

Docker Compose creates persistent volumes for:

- `db_data`: PostgreSQL database files
- `rmq_data`: RabbitMQ data and configuration

To completely reset:

```bash
docker compose down -v
docker volume rm selino_db_data selino_rmq_data
```

## Networking

All services run on a dedicated bridge network called `selino_network`. Services can communicate using their service names (e.g., `db`, `rmq`, `app`).

## Profiles

Docker Compose uses profiles to manage different environments:

- `development`: Full development stack
- `test`: Test environment with separate database

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
docker compose logs <service-name>
```

### Database Connection Issues

Ensure the service is healthy:

```bash
docker compose ps
```

All services should show "healthy" status.

### Reset Everything

```bash
docker compose down -v
docker compose build --no-cache
docker compose --profile development up -d
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
docker compose -f docker-compose.yml --env-file .env.production up -d
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [RabbitMQ Docker Hub](https://hub.docker.com/_/rabbitmq)
