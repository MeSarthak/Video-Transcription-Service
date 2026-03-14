# ── Stage 1: Build ──────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/

# Install all deps (including devDependencies for build)
RUN npm install

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

# Build shared → server
RUN npm run build -w packages/shared
RUN npm run build -w apps/server

# ── Stage 2: Production ────────────────────
FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app

# Install ffmpeg + Python + Whisper for video pipeline
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       python3 \
       python3-pip \
       python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages openai-whisper

# Copy workspace root + lockfile
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/

# Install production deps only
RUN npm install --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy static files if needed
COPY apps/server/public ./apps/server/public

# Create temp directory for uploads
RUN mkdir -p /app/apps/server/public/temp

EXPOSE 8000

WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]
