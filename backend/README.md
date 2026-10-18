# FixMate API

NestJS + PostgreSQL (Prisma) + Redis (BullMQ) + Socket.IO. See the [project README](../README.md) for the full picture.

## Commands

| Command | What it does |
|---|---|
| `npm run start:dev` | Run the API with auto-restart on save |
| `npm run db:migrate -- --name <change>` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Load demo data (safe to run again) |
| `npm run db:studio` | Browse the database in the browser |
| `npm run db:clean-test` | Show leftover test data (`@test.lk` users); add `-- --yes` to delete it |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests against the `fixmate_test` database |
| `npm run lint` | Lint |
| `npm run build` / `npm run start:prod` | Production build / run |

## Configuration

Copy `.env.example` to `.env`. Every setting is validated on start-up (`src/config/env.validation.ts`), so a missing or wrong value stops the app with a clear message.

Optional integrations fall back gracefully:
- no `ANTHROPIC_API_KEY` → the AI assistant uses a keyword classifier
- no `FIREBASE_SERVICE_ACCOUNT_PATH` → FCM pushes are logged (Expo push tokens still work)

## API

- REST: `/api/v1/...` — interactive docs at `/api/docs`
- Socket.IO: connect to the server root with `io(url, { auth: { token: accessToken } })`

| Server → client event | Payload |
|---|---|
| `booking:updated` | `{ id, code, status }` |
| `notification:new` | notification |
| `message:new` | message |
| `message:read` | `{ bookingId, readerId, readAt }` |
| `typing` | `{ bookingId, userId, isTyping }` |

| Client → server event | Payload | Ack |
|---|---|---|
| `message:send` | `{ bookingId, body }` | `{ ok, data \| error }` |
| `message:read` | `{ bookingId }` | `{ ok }` |
| `typing` | `{ bookingId, isTyping }` | `{ ok }` |
