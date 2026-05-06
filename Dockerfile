FROM node:22-alpine AS base
WORKDIR /app

FROM base AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci

FROM base AS web-deps
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci

FROM base AS server-builder
WORKDIR /app/server
COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/src ./src
COPY server/tsconfig.json ./
RUN npm run build

FROM base AS web-builder
WORKDIR /app/web
COPY --from=web-deps /app/web/node_modules ./node_modules
COPY web/src ./src
COPY web/index.html ./
COPY web/vite.config.ts ./
COPY web/tsconfig*.json ./
RUN npm run build

FROM base AS server-runtime
WORKDIR /app

ENV NODE_ENV=production
ENV TWILIO_HOST=0.0.0.0
ENV TWILIO_PORT=4010

RUN addgroup -g 1001 -S smspit && adduser -S smspit -u 1001

COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules

RUN mkdir -p /app/data && chown -R smspit:smspit /app

USER smspit

EXPOSE 4010

CMD ["node", "dist/index.js"]