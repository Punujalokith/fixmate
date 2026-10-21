# FixMate — Interview Demo Guide

## Before the interview (the day before)

- [ ] Install the **Docker Desktop update** (stops the start-up crash).
- [ ] Remove leftover test data so only real demo providers appear:
      `cd backend` → `npm run db:clean-test -- --yes`
- [ ] Run the full demo once: `powershell -ExecutionPolicy Bypass -File .\start-demo.ps1`
- [ ] Phone: Expo Go installed and updated, battery charged, hotspot works with the laptop.
- [ ] **Record a 3-minute screen video** of the demo (backup if the Wi-Fi fails in the interview).
- [ ] Open in browser tabs: GitHub repo, Actions (green CI), admin site, Swagger.

## Starting the demo (5 minutes before)

1. Connect the laptop to the phone's hotspot (or the same Wi-Fi).
2. In the project folder: `powershell -ExecutionPolicy Bypass -File .\start-demo.ps1`
3. Scan the QR code from the **FixMate Mobile** window with Expo Go.
4. In the Expo window press **w** to open the same app in the laptop browser (this will be the provider).

| Role | Login | Shown on |
|---|---|---|
| Customer | `customer@fixmate.lk` / `Customer@123` | Phone |
| Provider (CoolAir AC) | `dilshan@fixmate.lk` / `Provider@123` | Laptop browser (localhost:8081) |
| Admin | `admin@fixmate.lk` / *your own admin password* (set with `SEED_ADMIN_PASSWORD` when seeding the cloud DB) | Laptop browser (localhost:5173) |

## The 5-minute demo

**1. The problem (20 s)**
"Finding a reliable plumber or AC technician in Sri Lanka is word-of-mouth and phone calls. FixMate is a marketplace where customers book verified local providers, with live updates and chat."

**2. Customer on the phone (90 s)**
- Home screen → categories, top-rated providers.
- **Ask AI** → tap *"AC is running but not cooling"* → it detects **AC Repair**, urgency, follow-up questions, and recommends providers.
- Open **CoolAir AC Solutions** → services, working hours, reviews.
- **Book** → pick a day and time (only slots inside the provider's hours) → confirm.

**3. Provider on the laptop — real-time (60 s)**
- Provider dashboard shows "1 new request" — it appeared **without refreshing** (Socket.IO).
- Open the booking → **Accept job** → point at the phone: status changed to **Accepted** instantly.
- Send a chat message from the phone → it appears on the laptop live, with "Seen".

**4. Admin website (45 s)**
- Overview: revenue, bookings chart, verification queue.
- Providers → verify a business. Reviews → hide a review (rating recalculates).
- Audit log → every admin action is recorded.

**5. Engineering (45 s)**
- Swagger at `/api/docs` — all endpoints documented.
- GitHub → **Actions**: every push runs lint, build, 23 unit + 39 end-to-end tests with real Postgres and Redis, and builds the Docker image.

## What to say about the architecture

"It's a **modular monolith** in NestJS — separate modules for auth, marketplace, bookings, chat, notifications, AI and admin, sharing one PostgreSQL database through Prisma. Redis is used for caching and for **BullMQ** background jobs. The React Native app and the React admin site both talk to the same versioned REST API, and real-time updates go over **Socket.IO**, authenticated with the same JWT."

## Questions interviewers often ask

**Why a monolith instead of microservices?**
One developer, one database, strong consistency for bookings and payments. Modules have clear boundaries, so a module (e.g. notifications) could become its own service later if it needed to scale separately.

**How does login work? Why two tokens?**
A short-lived **access token** (JWT, 15 min) is sent with every request. A long-lived **refresh token** gets a new access token. Refresh tokens are random strings stored **hashed** in the database and **rotate** on every use. If an old one is used again, it was probably stolen, so every session of that user is revoked.

**How do you stop two customers booking the same time?**
The provider can only accept a booking if it doesn't overlap another accepted job (checked using the service duration). Status changes use **optimistic locking**: the update only succeeds if the status is still what we read, so two people can't change the same booking at once.

**What is the booking state machine?**
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED, with REJECTED / CANCELLED / EXPIRED. A table defines which role may make each move (only the provider accepts, only the system expires). Every change is written to a history table.

**What happens if a provider never answers?**
When a booking is created, a **delayed BullMQ job** is scheduled for 30 minutes later. If the booking is still pending, it expires and both sides are notified. A **cron job** every 5 minutes is a safety net in case a job is lost.

**How does real-time work?**
The app opens a Socket.IO connection with its access token. The server verifies it and puts the socket in a private room `user:<id>`. Any service can then send an event to that user — booking updates, new messages, notifications.

**How does the AI part work?**
The customer's text goes to the Claude API with a list of categories. The response is forced into a **JSON schema** (category, urgency, follow-up questions, safety advice), validated, and then matched to real providers from the database. Without an API key it falls back to a keyword classifier, so the feature never breaks. Every call is logged with tokens and latency for the admin.

**How did you test it?**
Unit tests for pure logic (state machine, availability, classifier). End-to-end tests start the real app against a **separate test database** and Redis and call it over HTTP and Socket.IO — 39 scenarios including security cases like stolen refresh tokens and fake image uploads. CI runs them on every push.

**What security did you think about?**
Hashed passwords (bcrypt), hashed refresh tokens, role guards on every route, rate limiting on login, input validation that rejects unknown fields, file type checked by the file's bytes (not its name), path-traversal protection, and audit logs for admin actions.

**What was hardest?**
Pick one that you can explain in detail, for example:
- Time zones: Sri Lanka is UTC+5:30, so dashboard months were shifted until everything was bucketed in UTC.
- Expo Go on Android dropped remote push notifications, so the notifications module had to be loaded only in real builds.
- Rate limiting behind a hosting proxy needs `trust proxy`, otherwise every user looks like the same IP.

**What would you add next?**
Online card payments (PayHere sandbox), maps and distance-based search, Sinhala/Tamil language support, provider identity verification with document upload, and moving uploads to cloud storage.

**How did you build it?** (answer honestly)
"I planned the scope and architecture, and used an AI coding assistant (Claude Code) heavily for implementation. I tested every flow myself on real devices, found and fixed bugs, and I can walk you through any part of the code." — Be ready to open any file and explain it.

## If something goes wrong

| Problem | Fix |
|---|---|
| Docker won't start (dockerInference error) | Quit Docker → `wsl --shutdown` → delete `%LOCALAPPDATA%\Docker\run\dockerInference` → start again |
| Phone can't connect | Same hotspot? Allow **Node.js** through Windows Firewall (Private + Public). Or use the laptop browser version (press **w**) |
| Phone shows an old IP | Close all windows and run `start-demo.ps1` again — it detects the new address |
| Nothing works | Play the backup video, then walk through the code and the GitHub CI |
