FROM node:22-bookworm AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG PNPM_VERSION=10.15.0
RUN corepack enable
RUN corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS pruner
WORKDIR /app
ARG APP_NAME=outlook-mcp
COPY . .
RUN pnpm dlx turbo prune @unique/${APP_NAME} --docker

FROM base AS deps
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY ./pnpm-lock.yaml ./pnpm-lock.yaml
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS builder
ARG APP_NAME=outlook-mcp
WORKDIR /app

COPY --from=deps /app/ .
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/servers/${APP_NAME}/prisma ./servers/${APP_NAME}/prisma

RUN pnpm --filter=@unique/${APP_NAME} db:generate && \
    pnpm turbo build --filter=@unique/${APP_NAME}... && \
    pnpm --filter=@unique/${APP_NAME} deploy out

FROM node:22-bookworm-slim AS runner
ARG APP_NAME=outlook-mcp
ARG PNPM_VERSION=10.15.0
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --shell /bin/bash --create-home nestjs

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@${PNPM_VERSION} --activate

ENV NODE_ENV=production

COPY --from=builder --chown=nestjs:nodejs /app/servers/${APP_NAME}/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/servers/${APP_NAME}/@generated ./@generated
COPY --from=builder --chown=nestjs:nodejs /app/out/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/out/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/out/prisma ./prisma

USER nestjs
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "node --enable-source-maps --max-old-space-size=${MAX_HEAP_MB:-1024} dist/main.js"]
