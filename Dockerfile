# Stage 1 — Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including dev for building)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript → JavaScript
RUN npm run build

# ────────────────────────────────────────

# Stage 2 — Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main"]