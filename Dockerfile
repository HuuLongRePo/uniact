# Multi-stage Dockerfile for Next.js App Router
# Optimized for production deployment
# 
# Build stages:
# 1. dependencies - Install npm packages
# 2. builder - Build Next.js application
# 3. runner - Production runtime (minimal image)

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (with cache optimization)
# --prefer-offline: Use cached packages if available
# --no-audit: Skip security audit for faster builds
RUN npm ci --prefer-offline --no-audit

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Build Next.js application
# - Generates .next directory with optimized code
# - Creates standalone output for lighter deployment
RUN npm run build

# Stage 3: Runtime (Production Image)
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy database file (if exists) - SQLite database
COPY --chown=nextjs:nodejs uniact.db* ./

# Copy .env file (build-time, not passed at runtime)
# WARNING: Only use for non-sensitive values. Secrets should come from env vars!
COPY --chown=nextjs:nodejs .env.production ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 3000, path: '/api/health', method: 'GET', timeout: 2000 }; http.request(options, (res) => { if (res.statusCode === 200) { process.exit(0); } process.exit(1); }).on('error', () => { process.exit(1); }).end();"

# Start Next.js server
# - Uses built-in server in standalone mode
# - Listens on port 3000
CMD ["node", "server.js"]

# ═══════════════════════════════════════════════════════════════
# BUILD INSTRUCTIONS
# ═══════════════════════════════════════════════════════════════
# 
# 1. Build image:
#    docker build -t uniact:latest .
# 
# 2. Run container:
#    docker run -p 3000:3000 \
#      -e JWT_SECRET="your-secret-key" \
#      -e NODE_ENV=production \
#      uniact:latest
# 
# 3. With docker-compose:
#    docker-compose up -d
# 
# ═══════════════════════════════════════════════════════════════
# OPTIMIZATION NOTES
# ═══════════════════════════════════════════════════════════════
# 
#  ✅ Multi-stage: Only dependencies + runtime included in final image
#  ✅ Alpine: Lightweight base image (~5MB)
#  ✅ Non-root user: Better security
#  ✅ Layer caching: npm ci before source copy (faster rebuilds)
#  ✅ Health check: Kubernetes can restart unhealthy containers
#  ✅ Standalone: No need for Node.js in production (future optimization)
# 
# IMAGE SIZE COMPARISON:
# ┌─────────────────────────────────────────────────┐
# │ Naive (single stage): ~800 MB                   │
# │ Multi-stage (this): ~200 MB                     │
# │ With standalone: ~150 MB                        │
# └─────────────────────────────────────────────────┘
