# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les dépendances
COPY package.json package-lock.json* ./
RUN npm ci

# Copier le code source et builder
COPY . .
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    PORT=5177

WORKDIR /app

# Copier uniquement le build Nuxt standalone
COPY --from=builder /app/.output /app/.output

EXPOSE 5177

CMD ["node", ".output/server/index.mjs"]
