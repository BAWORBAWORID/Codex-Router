# SRouter - AI Gateway & LLM Proxy Router
# Multi-stage Dockerfile for production deployment

# =============================================================================
# Base Stage - Ubuntu 22.04 with Node.js 22 and pnpm
# =============================================================================
FROM ubuntu:22.04 AS base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=22 \
    PNPM_VERSION=12.5.1 \
    PATH="/root/.local/share/pnpm:/root/.pnpm-global/node_modules/.bin:$PATH"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Create application directories
RUN mkdir -p /app /root /root/.srouter/backups /app/data \
    && chmod 777 /root

WORKDIR /app

# =============================================================================
# Dependencies Stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/constants/package.json ./packages/constants/
COPY packages/db/package.json ./packages/db/
COPY packages/executors/package.json ./packages/executors/
COPY packages/pricing/package.json ./packages/pricing/
COPY packages/providers/package.json ./packages/providers/
COPY packages/translator/package.json ./packages/translator/
COPY packages/types/package.json ./packages/types/

# Install dependencies using pnpm (workspace:* protocol requires pnpm)
RUN pnpm install --frozen-lockfile

# =============================================================================
# Builder Stage - Build all packages and applications
# =============================================================================
FROM deps AS builder
ENV CI=true

# Copy source code
COPY . .

# Build all packages and apps in correct order
RUN pnpm run build

RUN pnpm --config.inject-workspace-packages=true --filter api deploy --prod /app/deploy

# =============================================================================
# Production Stage - Minimal runtime image
# =============================================================================
FROM base AS production

# Create non-root user for security (optional, but recommended)
RUN groupadd -r srouter && useradd -r -g srouter -d /app -s /bin/bash srouter

# Copy built artifacts from builder
COPY --from=builder /app/deploy ./
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Create data directory for SQLite database
RUN mkdir -p /app/data /root/.srouter/backups \
    && chown -R srouter:srouter /app /app/data /root/.srouter

# Set working directory
WORKDIR /app

# Switch to non-root user
USER srouter

# Expose API and OAuth callback ports
EXPOSE 4000 1455

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:' + (process.env.PORT || 4000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Environment variables
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_PATH=/app/data/srouter.db \
    WEB_DIST_PATH=/app/apps/web/dist

VOLUME ["/app/data"]

# Start the API server
CMD ["node", "dist/index.js"]

# =============================================================================
# Development Stage (optional - for docker-compose dev)
# =============================================================================
FROM deps AS development

WORKDIR /app

# Expose both API and Web ports for development
EXPOSE 4000 1455

# Default to development command
CMD ["pnpm", "run", "dev"]