# ---------- 1. Build ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: the postinstall "prisma generate" runs below, after the schema is copied
RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
RUN npx prisma generate

COPY src ./src
RUN npm run build

# ---------- 2. Runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# Production dependencies only (includes the Prisma CLI, used to run migrations on start).
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

# Apply any new database migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
