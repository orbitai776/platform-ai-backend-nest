# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Stage 2: Production
FROM node:22-alpine

RUN apk add --no-cache tini && \
    rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/yarn.lock ./
COPY --from=builder --chown=node:node /app/prisma ./prisma

RUN ls -la node_modules/@prisma/client/ || echo "Prisma client missing!"
RUN ls -la node_modules/.prisma/ || echo "Prisma .prisma missing!"

RUN yarn install --production --frozen-lockfile --ignore-scripts && \
    yarn cache clean && \
    rm -rf /root/.cache /tmp/*

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]