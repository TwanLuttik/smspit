FROM node:22-alpine AS base
WORKDIR /app

FROM base AS server-deps
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci

FROM base AS web-deps
WORKDIR /app
COPY package*.json ./
COPY web/package*.json ./web/
RUN npm ci

FROM base AS server-builder
WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=server-deps /app/server ./server
COPY --from=server-deps /app/package*.json ./
COPY server/src ./server/src
COPY server/tsconfig.json ./server/
RUN npm run build --workspace=server

FROM base AS web-builder
WORKDIR /app
COPY --from=web-deps /app/node_modules ./node_modules
COPY --from=web-deps /app/web ./web
COPY --from=web-deps /app/package*.json ./
COPY web/src ./web/src
COPY web/index.html ./web/
COPY web/vite.config.ts ./web/
COPY web/tsconfig*.json ./web/
RUN npm run build --workspace=web

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