# Local Development Setup

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Frontend & Backend |
| Java JDK | 17 | Gradle / Android build |
| Android SDK | API 34 | Compile Android app |
| Redis | 7+ | Job queue |

---

## 1. Install Android SDK (without Android Studio)

### Windows
```powershell
# Download command-line tools
# https://developer.android.com/studio#command-tools
# Extract to C:\Android\cmdline-tools\latest\

# Set env vars (add to System Environment Variables)
$env:ANDROID_SDK_ROOT = "C:\Android"
$env:PATH += ";C:\Android\cmdline-tools\latest\bin;C:\Android\platform-tools"

# Accept licenses and install SDK
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

### macOS / Linux
```bash
# Download command-line tools from https://developer.android.com/studio
mkdir -p ~/android-sdk/cmdline-tools
unzip commandlinetools-*.zip -d ~/android-sdk/cmdline-tools/
mv ~/android-sdk/cmdline-tools/cmdline-tools ~/android-sdk/cmdline-tools/latest

export ANDROID_SDK_ROOT=~/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools
echo 'export ANDROID_SDK_ROOT=~/android-sdk' >> ~/.bashrc

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

---

## 2. Make the Gradle wrapper executable

```bash
cd android-template
chmod +x gradlew

# Test the template builds manually
./gradlew assembleRelease --no-daemon
# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 3. Start Redis

```bash
# Docker (easiest)
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Or install locally (macOS)
brew install redis && brew services start redis

# Or install locally (Ubuntu/Debian)
sudo apt install redis-server && sudo systemctl start redis
```

---

## 4. Backend

```bash
cd backend
cp .env.example .env          # edit if needed
npm install
npx prisma db push            # creates SQLite DB
npm run dev                   # starts on :4000
```

---

## 5. Worker

```bash
cd worker
npm install
# Ensure ANDROID_SDK_ROOT and JAVA_HOME are set in your shell
npm run dev                   # connects to Redis and waits for jobs
```

---

## 6. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # opens http://localhost:3000
```

---

## Build Pipeline — Step by Step

```
User submits form (POST /api/builds)
         │
         ▼
Backend validates URL, sanitizes inputs
         │
         ▼
Creates Build record (status=QUEUED)
         │
         ▼
Pushes job to BullMQ (Redis)
         │
         ▼
Worker picks up job
  ├─ Copies android-template/ → /tmp/apkmaker-{buildId}/
  ├─ Replaces strings.xml values (URL, app name)
  ├─ Replaces colors.xml (theme color)
  ├─ Renames Java package directory
  ├─ Updates package declarations in .java files
  ├─ Updates AndroidManifest.xml
  ├─ Writes config.xml (feature flags)
  ├─ Copies/resizes icon → res/mipmap-*/
  ├─ Copies/resizes splash → res/drawable-*/
  └─ Runs: ./gradlew assembleRelease --no-daemon
         │
         ▼
Copies APK to storage/apks/{packageName}-{id}.apk
Updates Build record (status=SUCCESS, outputPath)
         │
         ▼
Frontend polls /api/builds/:id every 3s
SSE stream pushes live logs during build
User downloads from /api/builds/:id/download
```

---

## Environment Variables Reference

### Backend (.env)
```
NODE_ENV=development
PORT=4000
DATABASE_URL="file:./data/apkmaker.db"
REDIS_URL=redis://localhost:6379
STORAGE_DIR=./storage
MAX_CONCURRENT_BUILDS=3       # parallel builds
BUILD_TIMEOUT_MS=300000       # 5 minute max per build
RATE_LIMIT_WINDOW_MS=900000   # 15 minute window
RATE_LIMIT_MAX=10             # max 10 builds per IP per window
JWT_SECRET=change-me
ALLOWED_ORIGINS=http://localhost:3000
```

### Worker (.env — same file as backend)
```
ANDROID_SDK_ROOT=/path/to/android-sdk
JAVA_HOME=/path/to/jdk
TEMPLATE_DIR=/path/to/android-template
STORAGE_DIR=./storage
```

---

## Signing APKs for Google Play

The template builds unsigned release APKs by default.
To produce a signed APK:

1. Generate a keystore:
```bash
keytool -genkey -v -keystore release.jks \
  -alias myapp -keyalg RSA -keysize 2048 -validity 10000
```

2. Add to `android-template/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file(System.getenv('KEYSTORE_PATH'))
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.release }
    }
}
```

3. Set the env vars in worker/.env before building.

---

## Scaling

- **More concurrent builds**: increase `MAX_CONCURRENT_BUILDS` and add more worker instances
- **S3 storage**: replace `STORAGE_DIR` file writes with AWS SDK calls in `worker/src/builder.js`
- **PostgreSQL**: change `DATABASE_URL` in `.env` and update `prisma/schema.prisma` provider
