FROM node:22-alpine AS base
RUN apk add --no-cache make gcc g++ python3
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/ai-engine/package.json ./packages/ai-engine/

RUN pnpm install --ignore-scripts


FROM base AS builder
COPY --from=deps /app .
COPY apps/api ./apps/api
COPY packages ./packages
COPY package.json pnpm-workspace.yaml turbo.json ./
# Force rebuild of native modules (like bcrypt) now that the compilers and source files are present
RUN pnpm rebuild
RUN pnpm db:generate
RUN pnpm --filter @thesis-review/database build
RUN pnpm --filter @thesis-review/ai-engine build
RUN pnpm --filter @thesis-review/api build

# Manually copy templates to the build output directory
RUN mkdir -p apps/api/dist/apps/api/src/thesis-generator/templates && \
    cp -r apps/api/src/thesis-generator/templates/* apps/api/dist/apps/api/src/thesis-generator/templates/ || true
RUN mkdir -p apps/api/dist/apps/api/src/templates && \
    cp -r apps/api/src/templates/* apps/api/dist/apps/api/src/templates/ || true

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install pnpm in the runner stage so the seed service has pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  font-noto \
  ttf-freefont

ENV PUPPETEER_SKIP_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app /app

EXPOSE 3001
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
