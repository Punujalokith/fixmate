---
title: FixMate API
emoji: 🛠️
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
short_description: NestJS API for the FixMate home-services marketplace
---

# FixMate API

Backend for [FixMate](https://github.com/Punujalokith/fixmate), a home-services marketplace for Sri Lanka.

- Health check: `/api/v1/health`
- API docs (Swagger): `/api/docs`

The Dockerfile clones the GitHub repo and builds `backend/`. Configuration comes from the Space's
**Settings → Variables and secrets** (`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, …).
