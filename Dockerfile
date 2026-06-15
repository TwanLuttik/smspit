FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

FROM base AS server-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile

FROM base AS web-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY web/package.json ./web/
RUN pnpm install --frozen-lockfile

FROM base AS server-builder
WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=server-deps /app/server ./server
COPY --from=server-deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY server/src ./server/src
COPY server/tsconfig.json ./server/
RUN pnpm --filter @smspit/server build

FROM base AS web-builder
WORKDIR /app
COPY --from=web-deps /app/node_modules ./node_modules
COPY --from=web-deps /app/web ./web
COPY --from=web-deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY web/src ./web/src
COPY web/index.html ./web/
COPY web/vite.config.ts ./web/
COPY web/tsconfig*.json ./web/
RUN pnpm --filter @smspit/web build

FROM base AS server-runtime
WORKDIR /app

ENV NODE_ENV=production
ENV TWILIO_HOST=0.0.0.0
ENV TWILIO_PORT=4010

RUN addgroup -g 1001 -S smspit && adduser -S smspit -u 1001

COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/node_modules ./node_modules

RUN mkdir -p /app/data && chown -R smspit:smspit /app

USER smspit

EXPOSE 4010

CMD ["node", "dist/index.js"]