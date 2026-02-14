# Selino - NestJS Project Copilot Instructions

## Project Overview

Selino is a NestJS backend application built with TypeScript. This project uses the latest Node.js and NestJS versions.

## Getting Started

### Prerequisites

- Node.js (latest version)
- npm (latest version)
- NestJS CLI

### Installation

```bash
npm install
```

### Development

```bash
npm run start:dev
```

### Build & Production

```bash
npm run build
npm run start:prod
```

### Testing

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Project Structure

```
src/
├── app.controller.ts      # Main controller
├── app.module.ts          # Root module
├── app.service.ts         # Main service
└── main.ts                # Application entry point

test/
└── app.e2e-spec.ts        # End-to-end tests
```

## Development Guidelines

### Code Style

- TypeScript with strict mode enabled
- ESLint configured for code quality
- Prettier configured for consistent formatting
- Run `npm run lint` to check code style
- Run `npm run format` to format code

### Testing

- Jest framework configured for unit tests
- E2E tests in `test/` directory
- Write tests alongside features

### Environment Variables

Create a `.env` file in the root directory for environment-specific configuration. Example:

```
NODE_ENV=development
PORT=3000
```

## Common Commands

| Command               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `npm run start`       | Start the application                      |
| `npm run start:dev`   | Start in development mode with auto-reload |
| `npm run start:debug` | Start with debugging enabled               |
| `npm run build`       | Build for production                       |
| `npm run lint`        | Run ESLint                                 |
| `npm run test`        | Run unit tests                             |
| `npm run test:e2e`    | Run end-to-end tests                       |
| `npm run test:cov`    | Run tests with coverage report             |

## Creating Modules

Use NestJS CLI to generate modules, controllers, and services:

```bash
nest generate module feature-name
nest generate controller feature-name
nest generate service feature-name
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [ESLint Configuration](https://eslint.org/docs/rules/)

## Notes

- Keep dependencies up to date
- Write meaningful commit messages
- Add tests for new features
- Document API endpoints and modules
- always run `npm build` to test codebase syntax
- always let drizzle handle migrations
  - use `db:generate` script to generate migrations from changes to schema
  - do not use `db:migrate`, that actually migrates the db and it should be done manually
