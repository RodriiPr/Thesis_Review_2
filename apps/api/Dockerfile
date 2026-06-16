FROM node:22-alpine AS base
RUN apk add --no-cache make gcc g++ python3
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/ai-engine/package.json ./packages/ai-engine/
RUN pnpm install --no-frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --no-frozen-lockfile --ignore-scripts
RUN pnpm db:generate
RUN pnpm --filter @thesis-review/database build
RUN pnpm --filter @thesis-review/ai-engine build
RUN pnpm --filter @thesis-review/api build

RUN mkdir -p apps/api/dist/apps/api/src/thesis-generator/templates && \
    cp -r apps/api/src/thesis-generator/templates/* apps/api/dist/apps/api/src/thesis-generator/templates/ || true
RUN mkdir -p apps/api/dist/apps/api/src/templates && \
    cp -r apps/api/src/templates/* apps/api/dist/apps/api/src/templates/ || true

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates font-noto ttf-freefont
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/ai-engine/package.json ./packages/ai-engine/package.json
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/ai-engine/dist ./packages/ai-engine/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/apps/api/src/main.js"]

