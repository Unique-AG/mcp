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
    # This triggers Prisma to download the engines, so we can stash them in the image.
    pnpm --filter=@unique/${APP_NAME} exec prisma --version && \
    pnpm turbo build --filter=@unique/${APP_NAME}... && \
    pnpm --filter=@unique/${APP_NAME} deploy out

RUN set -eux; \
    cd servers/${APP_NAME}; \
    ENG_DIR="$(node -e "console.log(require.resolve('@prisma/engines/package.json'))" | xargs dirname)"; \
    echo "Engines resolved to: $ENG_DIR"; \
    test -d "$ENG_DIR"; \
    mkdir -p /app/_engines; \
    cp -R "$ENG_DIR"/. /app/_engines;

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

ENV PNPM_HOME="/tmp/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_HOME="/tmp/.cache/corepack"
RUN corepack enable
RUN corepack prepare pnpm@${PNPM_VERSION} --activate
RUN mkdir -p /tmp/.cache/corepack && chown -R nestjs:nodejs /tmp/.cache/corepack

ENV NODE_ENV=production

COPY --from=builder --chown=nestjs:nodejs /app/servers/${APP_NAME}/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/servers/${APP_NAME}/@generated ./@generated
COPY --from=builder --chown=nestjs:nodejs /app/servers/${APP_NAME}/public ./public
COPY --from=builder --chown=nestjs:nodejs /app/out/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/out/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/out/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/_engines /prisma/engines

# Create symlink to the correct schema engine binary for the current platform
ENV PRISMA_SCHEMA_ENGINE_BINARY=/prisma/engines/schema-engine
RUN set -eux; \
    cd /prisma/engines; \
    SCHEMA_ENGINE=$(find . -name "schema-engine-*" -type f -executable | head -1); \
    if [ -n "$SCHEMA_ENGINE" ]; then \
        ln -sf "$SCHEMA_ENGINE" schema-engine; \
        echo "Created symlink: schema-engine -> $SCHEMA_ENGINE"; \
    else \
        echo "Warning: No schema engine binary found"; \
    fi

USER nestjs
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "node --enable-source-maps --max-old-space-size=${MAX_HEAP_MB:-1024} dist/main.js"]
