FROM eclipse-temurin:17-jdk

ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${PATH}"

RUN apt-get update && apt-get install -y curl unzip nodejs npm && rm -rf /var/lib/apt/lists/*

# Install Android SDK command-line tools
RUN mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    curl -sSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/cmdtools.zip && \
    unzip -q /tmp/cmdtools.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" && \
    rm /tmp/cmdtools.zip

RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate

CMD ["node", "src/index.js"]
