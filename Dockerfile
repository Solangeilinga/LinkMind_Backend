# Multi-stage build for production optimization

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies for build
RUN npm ci

# Copy source code
COPY src ./src

# Run security check
RUN npm run security-check --production || true

# Run linting
RUN npm run lint

# Stage 3: Production
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Copy logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Set user to non-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Use dumb-init to run process
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
