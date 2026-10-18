# FixMate API for a Hugging Face Docker Space.
# The Space only needs this file + README.md: it pulls the code from GitHub and builds it.
# To deploy new code: Space → Settings → "Factory rebuild".

# ---------- 1. Build ----------
FROM node:24-alpine AS build
RUN apk add --no-cache git
WORKDIR /src
ARG FIXMATE_REPO=https://github.com/Punujalokith/fixmate.git
ARG FIXMATE_BRANCH=main
RUN git clone --depth 1 --branch ${FIXMATE_BRANCH} ${FIXMATE_REPO} .

WORKDIR /src/backend
RUN npm ci --ignore-scripts && npx prisma generate && npm run build

# ---------- 2. Runtime ----------
FROM node:24-alpine
WORKDIR /app
# Hugging Face sends traffic to port 7860.
ENV NODE_ENV=production PORT=7860

COPY --from=build /src/backend/package.json /src/backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /src/backend/dist ./dist
COPY --from=build /src/backend/prisma ./prisma
COPY --from=build /src/backend/prisma.config.ts ./

# Spaces run the container as user 1000, which is the "node" user in this image.
RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 7860
# Apply any new database migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
