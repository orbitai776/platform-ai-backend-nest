# Stage 1: Build
FROM node:20-alpine AS builder

# BỔ SUNG: Cài openssl để Prisma hoạt động lúc build
RUN apk add --no-cache openssl

WORKDIR /app

ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json ./
RUN yarn install --ignore-optional
COPY . .
RUN yarn build

# Stage 2: Production deps only
FROM node:20-alpine AS prod-deps

WORKDIR /app

COPY package.json ./
RUN yarn install --production --ignore-optional && \
    yarn cache clean && \
    # Xoá packages không cần ở runtime
    rm -rf node_modules/typescript \
    node_modules/@types \
    node_modules/fast-check \
    node_modules/ts-node \
    node_modules/ts-loader \
    node_modules/prisma \
    node_modules/@prisma/engines \
    node_modules/@prisma/fetch-engine \
    node_modules/@prisma/engines-version && \
    # Xoá file rác
    find node_modules -name "*.md" -delete && \
    find node_modules -name "*.map" -delete && \
    find node_modules -name "CHANGELOG*" -delete && \
    find node_modules -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null; \
    true && \
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null; \
    true

# Stage 3: Runtime
FROM node:20-alpine AS runner

# BỔ SUNG: Cài openssl cùng với tini
RUN apk add --no-cache tini openssl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy prod deps + prisma generated client từ builder
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder   --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder   --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder   --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]