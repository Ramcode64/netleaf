# Multi-stage build for the Netleaf API.
# Build context must be the REPO ROOT (../..) so the workspace package.json
# and packages/shared-types are visible. docker-compose.yml sets context: . and
# dockerfile: apps/api/Dockerfile to satisfy this.

# ─── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Copy workspace manifests first so npm ci can use the lockfile cache.
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/

# npm ci installs the EXACT versions from package-lock.json (reproducible).
# Includes devDeps because we need tsc/drizzle-kit at build time.
RUN npm ci --workspaces --include-workspace-root

# Now copy the source. .dockerignore must exclude node_modules, dist, .git, etc.
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types
COPY tsconfig.base.json* ./

# Compile TypeScript → dist/
RUN npm run build -w apps/api

# Prune devDeps so the final stage only carries production deps.
RUN npm prune --omit=dev --workspaces --include-workspace-root

# ─── Stage 2: runner ─────────────────────────────────────────────────────────
FROM node:22-slim AS runner

# Playwright system deps. Same set as before — Chromium needs these even
# headless (font rendering, audio stubs, GTK ABI shims).
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libx11-6 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r netleaf && useradd -r -g netleaf -m netleaf

WORKDIR /app

# Copy production-only node_modules + built artifacts from the builder.
COPY --from=builder --chown=netleaf:netleaf /app/node_modules ./node_modules
COPY --from=builder --chown=netleaf:netleaf /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=netleaf:netleaf /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=netleaf:netleaf /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=netleaf:netleaf /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=netleaf:netleaf /app/packages ./packages
COPY --from=builder --chown=netleaf:netleaf /app/package.json ./package.json

# Install Playwright Chromium — must run as root, before USER switch. Browsers
# end up in /root/.cache/ms-playwright by default; rebind to the user's home so
# the non-root runtime can find them.
ENV PLAYWRIGHT_BROWSERS_PATH=/home/netleaf/.cache/ms-playwright
RUN cd apps/api && npx playwright install chromium && \
    chown -R netleaf:netleaf /home/netleaf/.cache

USER netleaf
WORKDIR /app/apps/api

EXPOSE 3000
CMD ["node", "dist/index.js"]
