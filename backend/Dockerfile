# Stage 1: Build & Install Dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Install all dependencies
RUN npm ci

COPY . .

# Stage 2: Production Release
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source files from builder stage
COPY --from=builder /usr/src/app/server.js ./server.js
COPY --from=builder /usr/src/app/src ./src

# Create data directory for local database backup file and set correct permissions
RUN mkdir -p data && chown -R node:node /usr/src/app

USER node

EXPOSE 5000

CMD ["node", "server.js"]
