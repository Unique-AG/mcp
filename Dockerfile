# Multi-stage Dockerfile for turborepo
# Usage: docker build --build-arg WORKSPACES="servers/mcp-server-quick-start packages/eslint-config" .

# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Set working directory
WORKDIR /app

# Copy all files first
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build argument for workspaces to build (use package names, not file paths)
ARG WORKSPACES="@unique/mcp-server-quick-start"

# Build selected workspaces
RUN pnpm turbo run build --filter="${WORKSPACES}"

# Production stage
FROM node:22-alpine AS production

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY servers/*/package.json ./servers/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder stage
COPY --from=builder /app/servers ./servers
COPY --from=builder /app/packages ./packages

# Copy node_modules from builder stage to ensure all dependencies are available
COPY --from=builder /app/node_modules ./node_modules

# Set default command
CMD ["node", "servers/quick-start/dist/server.js"]
# @valerio: need help to make this generic