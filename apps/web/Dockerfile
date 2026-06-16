FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/ai-engine/package.json ./packages/ai-engine/
COPY packages/database/package.json ./packages/database/
RUN pnpm install --ignore-scripts --filter @thesis-review/web...

FROM base AS builder
COPY --from=deps /app .
COPY apps/web ./apps/web
COPY packages ./packages
COPY package.json pnpm-workspace.yaml turbo.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @thesis-review/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
