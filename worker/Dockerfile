FROM eclipse-temurin:17-jdk

ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV GRADLE_VERSION=8.6
ENV PATH="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:/opt/gradle/bin:${PATH}"

# Install curl/unzip, then Node 20 via NodeSource
RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# Install Gradle 8.6 directly (avoids gradlew wrapper jar dependency)
RUN curl -sSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" \
        -o /tmp/gradle.zip && \
    unzip -q /tmp/gradle.zip -d /opt && \
    mv "/opt/gradle-${GRADLE_VERSION}" /opt/gradle && \
    rm /tmp/gradle.zip

# Install Android SDK command-line tools
RUN mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    curl -sSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/cmdtools.zip && \
    unzip -q /tmp/cmdtools.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" && \
    rm /tmp/cmdtools.zip

# Pre-accept all Android SDK licenses
RUN mkdir -p "${ANDROID_SDK_ROOT}/licenses" && \
    echo "24333f8a63b6825ea9c5514f83c2829b004d1fee\nd56f5187479451eabf01fb78af6dfcb131a6481e\n82ae8b84d98d2f62c3c6b1e05df74c5a5b4c7b92" \
        > "${ANDROID_SDK_ROOT}/licenses/android-sdk-license" && \
    echo "84831b9409646a918e30573bab4c9c91346d8abd" \
        > "${ANDROID_SDK_ROOT}/licenses/android-sdk-preview-license" && \
    echo "33b6a2b64607f11b759f320ef9dff4ae5c47d97a" \
        > "${ANDROID_SDK_ROOT}/licenses/google-gdk-license" && \
    echo "e9acab5b5fbb560a72cfaecce8946896ff6aab9d" \
        > "${ANDROID_SDK_ROOT}/licenses/intel-android-extra-license"

# Install required SDK components
RUN sdkmanager --update && \
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "src/index.js"]
