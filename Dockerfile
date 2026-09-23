# SRouter - AI Gateway & LLM Proxy Router
# Multi-stage Dockerfile for production deployment

# =============================================================================
# Base Stage - Ubuntu 22.04 with Node.js 22 and pnpm
# =============================================================================
FROM ubuntu:22.04 AS base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=22 \
    PNPM_VERSION=9 \
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
RUN mkdir -p /app /root/.srouter/backups /app/data

WORKDIR /app

# =============================================================================
# Dependencies Stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/constants/package.json ./packages/constants/
COPY packages/db/package.json ./packages/db/
COPY packages/executors/package.json ./packages/executors/
COPY packages/pricing/package.json ./packages/pricing/
COPY packages/providers/package.json ./packages/providers/
COPY packages/translator/package.json ./packages/translator/
COPY packages/types/package.json ./packages/types/

# Install dependencies using npm (workspaces are defined in package.json)
RUN npm install

# =============================================================================
# Builder Stage - Build all packages and applications
# =============================================================================
FROM deps AS builder

# Copy source code
COPY . .

# Build all packages and apps in correct order
RUN pnpm run build

# =============================================================================
# Production Stage - Minimal runtime image
# =============================================================================
FROM base AS production

# Create non-root user for security (optional, but recommended)
RUN groupadd -r srouter && useradd -r -g srouter -d /app -s /bin/bash srouter

# Copy built artifacts from builder
COPY --from=builder /app /app

# Create data directory for SQLite database
RUN mkdir -p /app/data /root/.srouter/backups \
    && chown -R srouter:srouter /app /app/data /root/.srouter

# Set working directory
WORKDIR /app

# Switch to non-root user
USER srouter

# Expose API port (default 4000 as per production setup)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Environment variables
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_PATH=/app/data/srouter.db \
    WEB_DIST_PATH=/app/apps/web/dist

# Start the API server
CMD ["node", "apps/api/dist/index.js"]

# =============================================================================
# Development Stage (optional - for docker-compose dev)
# =============================================================================
FROM deps AS development

WORKDIR /app

# Expose both API and Web ports for development
EXPOSE 3000 1455 4000

# Default to development command
CMD ["pnpm", "run", "dev"]