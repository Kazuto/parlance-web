# Build stage
FROM oven/bun:latest AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Nuxt types and prepare
RUN bun run nuxt prepare

# Build the application
RUN bun run build

# Runtime stage
FROM oven/bun:latest AS runtime
WORKDIR /app

# Copy built application
COPY --from=builder /app/.output ./.output

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Run the application
CMD ["bun", "run", ".output/server/index.mjs"]
