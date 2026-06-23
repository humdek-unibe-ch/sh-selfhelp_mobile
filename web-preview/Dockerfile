# syntax=docker/dockerfile:1
#
# SPDX-FileCopyrightText: 2026 Humdek, University of Bern
# SPDX-License-Identifier: MPL-2.0
#
# selfhelp-mobile-preview image: an Expo web export of the mobile app served
# under /mobile-preview, with a narrow same-origin reverse proxy to the private
# backend. Build context is the mobile repo root:
#
#   docker build -f web-preview/Dockerfile -t selfhelp-mobile-preview:dev .
#
# The curated official-plugin set is baked in at build time via the snapshot
# (web-preview/preview-plugins.json) so the bundled plugins render natively;
# every other plugin falls back to OpenOnWebFallback at runtime.

# ----------------------------------------------------------------------------
# Builder: install deps, bundle curated plugins, export the web build.
# ----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Image version (release tag without the leading `v`), baked into the served
# /mobile-preview/version.json so the manager/orchestrator can read the running
# image version + renderer contract without inspecting the image.
ARG VERSION=0.0.0

# Preview build mode: enables the same-origin proxy base + dev chrome gates and
# sets experiments.baseUrl so exported asset URLs resolve behind /mobile-preview.
ENV APP_WEB_PREVIEW=1
ENV APP_INSTANCE_SLUG=preview

# Install dependencies against the committed lockfile first (better layer cache).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# App sources.
COPY . .

# Bundle the curated official plugins (deterministic snapshot, no live instance)
# then install the packages the sync added before exporting.
RUN node scripts/plugins-sync.mjs web-preview --snapshot web-preview/preview-plugins.json
RUN npm install --no-audit --no-fund

# Export the static web build to /app/dist.
RUN npx expo export -p web

# Bake the served version manifest (image version + mobile renderer contract +
# curated bundled plugins) read from the committed snapshot. The runtime server
# serves dist/version.json at /mobile-preview/version.json.
RUN node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('web-preview/preview-plugins.json','utf8'));const out={version:process.env.VERSION||'$VERSION',mobileRendererVersion:s.mobileRendererVersion||null,bundledPlugins:(s.plugins||[]).map(p=>({id:p.pluginId,version:p.version,mobilePackage:p.mobilePackage,mobilePackageVersion:p.mobilePackageVersion}))};fs.writeFileSync('dist/version.json',JSON.stringify(out,null,2)+'\n');console.log('version.json',out.version,out.mobileRendererVersion);"

# ----------------------------------------------------------------------------
# Runtime: slim Node serving the static export + proxy (no dev dependencies).
# ----------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    SELFHELP_PREVIEW_BASE_URL=/mobile-preview \
    SELFHELP_PREVIEW_DIST_DIR=/app/dist

# The server uses only Node built-ins, so no npm install is needed at runtime.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web-preview/server.mjs ./web-preview/server.mjs

EXPOSE 8080

# Liveness/readiness for the orchestrator (matches the server's /healthz).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1

USER node
CMD ["node", "web-preview/server.mjs"]
