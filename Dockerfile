FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache gettext nginx \
    && corepack enable

COPY --from=builder /app/node_modules /app/node_modules
COPY . .

EXPOSE 8080

ENTRYPOINT ["/bin/sh", "/app/docker/dev-entrypoint.sh"]
