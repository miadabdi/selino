# Base stage - common for all stages
FROM node:24.13.0-alpine3.23 AS base

# Set working directory
WORKDIR /home/node/app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose application and debug ports
EXPOSE 3000 9229

# Start in development mode
CMD ["npm", "run", "start:dev"]

# Production dependencies stage
FROM base AS production-deps

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Production stage
FROM node:24.13.0-alpine3.23 AS production

WORKDIR /home/node/app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Copy production dependencies
COPY --from=production-deps /home/node/app/node_modules ./node_modules

# Copy built application
COPY --from=development /home/node/app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /home/node/app

USER nodejs

# Expose application port
EXPOSE 3000

# Start in production mode
CMD ["node", "dist/main"]
