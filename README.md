# APKMaker — Web-to-APK SaaS

Convert any website URL into a downloadable Android APK (WebView wrapper).

## Architecture

```
APKMaker/
├── frontend/          # Next.js 14 + Tailwind dashboard
├── backend/           # Express API + BullMQ job queue
├── worker/            # APK builder (Gradle invoker)
├── android-template/  # Base Android Studio project
└── docker-compose.yml
```

## Quick Start (Docker)

```bash
# 1. Prerequisites: Docker Desktop, Java 17+, Android SDK (for worker)
# 2. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Start everything
docker-compose up --build
```

App opens at http://localhost:3000

## Local Dev (no Docker)

See [DEVELOPMENT.md](DEVELOPMENT.md) for step-by-step local setup.

## How APK Generation Works

1. User submits form → `POST /api/builds`
2. Backend validates URL, sanitizes inputs, creates DB record
3. Job pushed to **BullMQ** Redis queue
4. Worker picks up job:
   a. Copies `android-template/` to temp dir
   b. Injects URL, app name, package name via sed/file replace
   c. Copies uploaded icon/splash into `res/` folders
   d. Runs `./gradlew assembleRelease` (or `bundleRelease` for AAB)
   e. Copies output APK to storage dir
5. Worker updates job status → backend notifies via SSE
6. User downloads APK from `/api/builds/:id/download`

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, Tailwind CSS, React Query |
| Backend | Express, Prisma, SQLite/PostgreSQL |
| Queue | BullMQ + Redis |
| Builder | Gradle 8, Android SDK, Java 17 |
| Storage | Local filesystem (S3-compatible swap-in) |
