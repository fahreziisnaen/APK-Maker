/**
 * Core APK builder. For each job it:
 *  1. Copies the Android template to a temp dir
 *  2. Injects all config values (URL, app name, package, theme, features)
 *  3. Copies icon/splash assets into the correct res/ folders
 *  4. Invokes Gradle to build the APK/AAB
 *  5. Copies the output to persistent storage
 *  6. Updates the DB record
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const { logger } = require('./utils/logger');
const { publishLog, publishStatus } = require('./publisher');

const execFileAsync = promisify(execFile);

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:4001';

function patchBuild(buildId, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`/api/builds/${buildId}/worker`, BACKEND_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 4001,
      path: url.pathname,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      res.resume();
      res.on('end', () => resolve());
    });
    req.on('error', (err) => {
      logger.warn('patchBuild HTTP error', { buildId, error: err.message });
      resolve(); // non-fatal
    });
    req.write(data);
    req.end();
  });
}

const TEMPLATE_DIR = process.env.TEMPLATE_DIR || path.resolve(__dirname, '../../android-template');
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || '../backend/storage');
const APKS_DIR = path.join(STORAGE_DIR, 'apks');

// Android res icon sizes: [dirSuffix, pixels]
const ICON_SIZES = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

async function processBuild(job) {
  const { buildId, ...config } = job.data;
  const tmpDir = path.join(os.tmpdir(), `apkmaker-${buildId}`);

  const appendLog = async (line) => {
    const ts = new Date().toISOString();
    const logLine = `[${ts}] ${line}`;
    logger.info(logLine, { buildId });
    await job.log(logLine);

    // Push to SSE clients via Redis pub/sub
    publishLog(buildId, logLine).catch(() => {});

    // Append to DB logs via backend API
    await patchBuild(buildId, { log: logLine });
  };

  try {
    await patchBuild(buildId, { status: 'BUILDING' });
    await appendLog('Build started');

    // Step 1: Copy template
    await appendLog('Copying Android template...');
    fs.mkdirSync(tmpDir, { recursive: true });
    copyDirSync(TEMPLATE_DIR, tmpDir);
    // Create local.properties so AGP can find the Android SDK
    const sdkDir = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '/opt/android-sdk';
    fs.writeFileSync(path.join(tmpDir, 'local.properties'), `sdk.dir=${sdkDir}\n`);

    // Step 2: Inject config
    await appendLog('Injecting configuration...');
    await injectConfig(tmpDir, config, buildId, appendLog);

    // Step 3: Copy assets
    await appendLog('Processing assets...');
    await injectAssets(tmpDir, config, appendLog);

    // Step 4: Gradle build
    fs.mkdirSync(APKS_DIR, { recursive: true });
    const gradleTask = config.buildAab ? 'bundleRelease' : 'assembleRelease';
    await appendLog(`Running Gradle task: ${gradleTask}`);
    await runGradle(tmpDir, gradleTask, appendLog, buildId);

    // Step 5: Find and copy output
    await appendLog('Copying output file...');
    const ext = config.buildAab ? 'aab' : 'apk';
    const outputFile = findOutput(tmpDir, ext);
    if (!outputFile) throw new Error(`Could not find ${ext} output file`);

    const filename = `${config.packageName}-${buildId.slice(0, 8)}.${ext}`;
    const destPath = path.join(APKS_DIR, filename);
    fs.copyFileSync(outputFile, destPath);

    const outputSize = fs.statSync(destPath).size;
    const relativePath = path.join('apks', filename);

    await patchBuild(buildId, { status: 'SUCCESS', outputPath: relativePath, outputSize });

    await appendLog(`Build succeeded! Output: ${filename} (${(outputSize / 1024 / 1024).toFixed(2)} MB)`);
    publishStatus(buildId, 'SUCCESS').catch(() => {});

  } catch (err) {
    logger.error('Build failed', { buildId, error: err.message });
    await patchBuild(buildId, { status: 'FAILED', errorMessage: err.message });
    await appendLog(`ERROR: ${err.message}`).catch(() => {});
    publishStatus(buildId, 'FAILED').catch(() => {});
    throw err;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// ─── Config injection ──────────────────────────────────────────────────────────

async function injectConfig(projectDir, config, buildId, appendLog) {
  const appModuleDir = path.join(projectDir, 'app');

  // 1. Update namespace and applicationId in build.gradle
  // AGP 8.x: namespace replaces the package attribute in AndroidManifest.xml
  replaceInFile(
    path.join(appModuleDir, 'build.gradle'),
    [
      [/namespace\s+"[^"]+"/g, `namespace "${config.packageName}"`],
      [/applicationId\s+"[^"]+"/g, `applicationId "${config.packageName}"`],
      [/versionName\s+"[^"]+"/g, `versionName "1.0"`],
    ]
  );

  // 2. strings.xml
  const stringsPath = path.join(appModuleDir, 'src/main/res/values/strings.xml');
  replaceInFile(stringsPath, [
    [/<string name="app_name">[^<]*<\/string>/g,
     `<string name="app_name">${escapeXml(config.appName)}</string>`],
    [/<string name="website_url">[^<]*<\/string>/g,
     `<string name="website_url">${escapeXml(config.websiteUrl)}</string>`],
    [/<string name="custom_user_agent">[^<]*<\/string>/g,
     `<string name="custom_user_agent">${escapeXml(config.userAgent || '')}</string>`],
  ]);

  // 3. colors.xml — theme color
  const colorsPath = path.join(appModuleDir, 'src/main/res/values/colors.xml');
  replaceInFile(colorsPath, [
    [/<color name="colorPrimary">[^<]*<\/color>/g,
     `<color name="colorPrimary">${config.themeColor}</color>`],
    [/<color name="colorPrimaryDark">[^<]*<\/color>/g,
     `<color name="colorPrimaryDark">${darkenHex(config.themeColor)}</color>`],
  ]);

  // 4. Rename Java source package directory
  const oldPkgPath = path.join(appModuleDir, 'src/main/java/com/example/webviewapp');
  const newPkgParts = config.packageName.split('.');
  const newPkgPath = path.join(appModuleDir, 'src/main/java', ...newPkgParts);

  if (fs.existsSync(oldPkgPath) && oldPkgPath !== newPkgPath) {
    // Move to a sibling temp path first to avoid src/dest overlap issues
    const tmpPath = oldPkgPath + '_tmp';
    fs.renameSync(oldPkgPath, tmpPath);
    copyDirSync(tmpPath, newPkgPath);
    fs.rmSync(tmpPath, { recursive: true, force: true });
  }

  // 5. Update package declaration in all Java/Kotlin files
  const javaDir = path.join(appModuleDir, 'src/main/java');
  updatePackageDeclarations(javaDir, config.packageName);

  // 6. AndroidManifest.xml — no package attribute needed in AGP 8.x;
  //    namespace is set in build.gradle above

  // 7. Feature flags via res/values/config.xml
  const configXmlPath = path.join(appModuleDir, 'src/main/res/values/config.xml');
  const configXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <bool name="enable_pull_to_refresh">${config.enablePullToRefresh}</bool>
    <bool name="enable_offline_fallback">${config.enableOfflineFallback}</bool>
    <bool name="enable_push_notifications">${config.enablePushNotifications}</bool>
</resources>`;
  fs.writeFileSync(configXmlPath, configXml, 'utf8');

  // 8. Offline page (assets/offline.html) — inject placeholders or use custom HTML
  const assetsDir = path.join(appModuleDir, 'src/main/assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  const offlineHtmlPath = path.join(assetsDir, 'offline.html');
  let offlineHtml = (config.offlinePageHtml && config.offlinePageHtml.trim())
    ? config.offlinePageHtml
    : fs.readFileSync(offlineHtmlPath, 'utf8');
  offlineHtml = offlineHtml
    .replace(/\{\{APP_NAME\}\}/g, escapeHtml(config.appName))
    .replace(/\{\{THEME_COLOR\}\}/g, /^#[0-9a-fA-F]{6}$/.test(config.themeColor) ? config.themeColor : '#2563EB');
  fs.writeFileSync(offlineHtmlPath, offlineHtml, 'utf8');

  await appendLog(`Injected config: package=${config.packageName}, url=${config.websiteUrl}`);
}

// ─── Asset injection ───────────────────────────────────────────────────────────

async function injectAssets(projectDir, config, appendLog) {
  // We use sharp in a child process wrapper since worker doesn't import it directly.
  // If sharp is installed in the worker, use it. Otherwise, skip resizing.
  let sharp;
  try { sharp = require('sharp'); } catch { /* sharp not available, skip */ }

  const resDir = path.join(projectDir, 'app/src/main/res');
  const uploadsDir = path.join(STORAGE_DIR, 'uploads', path.dirname(config.iconPath || '').split(path.sep).pop() || '');

  // Icon
  if (config.iconPath && sharp) {
    const srcIcon = path.join(STORAGE_DIR, config.iconPath);
    if (fs.existsSync(srcIcon)) {
      for (const [dir, size] of ICON_SIZES) {
        const destDir = path.join(resDir, dir);
        fs.mkdirSync(destDir, { recursive: true });
        await sharp(srcIcon)
          .resize(size, size)
          .png()
          .toFile(path.join(destDir, 'ic_launcher.png'));
        await sharp(srcIcon)
          .resize(size, size)
          .png()
          .toFile(path.join(destDir, 'ic_launcher_round.png'));
      }
      await appendLog('Icon assets injected');
    }
  }

  // Splash screen
  if (config.splashPath && sharp) {
    const srcSplash = path.join(STORAGE_DIR, config.splashPath);
    if (fs.existsSync(srcSplash)) {
      const splashSizes = [
        ['drawable-mdpi', 320, 480],
        ['drawable-hdpi', 480, 800],
        ['drawable-xhdpi', 720, 1280],
        ['drawable-xxhdpi', 1080, 1920],
      ];
      for (const [dir, w, h] of splashSizes) {
        const destDir = path.join(resDir, dir);
        fs.mkdirSync(destDir, { recursive: true });
        await sharp(srcSplash)
          .resize(w, h, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png()
          .toFile(path.join(destDir, 'splash.png'));
      }
      await appendLog('Splash screen assets injected');
    }
  }
}

// ─── Gradle build ──────────────────────────────────────────────────────────────

function runGradle(projectDir, task, appendLog, buildId) {
  return new Promise((resolve, reject) => {
    // Use system-installed gradle directly — avoids gradlew wrapper jar issues
    const gradleCmd = 'gradle';
    const args = [task, '--no-daemon', '--stacktrace', `-PbuildId=${buildId}`];

    const env = {
      ...process.env,
      ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME,
    };

    const proc = spawn(gradleCmd, args, { cwd: projectDir, env });
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Gradle build timed out'));
    }, parseInt(process.env.BUILD_TIMEOUT_MS) || 300_000);

    // Gradle prints its "WHAT WENT WRONG" summary and javac errors to stdout
    const stdoutLines = [];
    const stderrLines = [];

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        stdoutLines.push(line);
        appendLog(line).catch(() => {});
      });
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        stderrLines.push(line);
        appendLog(`[stderr] ${line}`).catch(() => {});
      });
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) { resolve(); return; }

      // 1. Look for javac "error:" lines (most specific)
      const javacErrors = stdoutLines.filter(l => /:\s+error:/.test(l));
      if (javacErrors.length > 0) {
        reject(new Error(javacErrors.slice(0, 3).join(' | ')));
        return;
      }

      // 2. Look for aapt2/resource errors
      const aaptErrors = stdoutLines.filter(l => /error:/.test(l) && !l.includes('stderr'));
      if (aaptErrors.length > 0) {
        reject(new Error(aaptErrors.slice(0, 3).join(' | ')));
        return;
      }

      // 3. Extract "What went wrong" section from stdout (Gradle prints it there)
      const wwIdx = stdoutLines.findIndex(l => l.includes('What went wrong'));
      if (wwIdx >= 0) {
        const summary = stdoutLines.slice(wwIdx + 1, wwIdx + 6).join(' | ').trim();
        reject(new Error(summary || `Gradle exited with code ${code}`));
        return;
      }

      // 4. Fall back to stderr "What went wrong" section
      const wwIdxErr = stderrLines.findIndex(l => l.includes('What went wrong'));
      if (wwIdxErr >= 0) {
        const summary = stderrLines.slice(wwIdxErr + 1, wwIdxErr + 6).join(' | ').trim();
        reject(new Error(summary || `Gradle exited with code ${code}`));
        return;
      }

      // 5. Last resort: last 5 non-empty stdout lines
      const lastLines = stdoutLines.slice(-5).join(' | ');
      reject(new Error(lastLines || `Gradle exited with code ${code}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start Gradle: ${err.message}`));
    });
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function findOutput(projectDir, ext) {
  const candidates = [
    path.join(projectDir, `app/build/outputs/apk/release/app-release.apk`),
    path.join(projectDir, `app/build/outputs/apk/release/app-release-unsigned.apk`),
    path.join(projectDir, `app/build/outputs/bundle/release/app-release.aab`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Walk outputs dir as fallback
  const outputsDir = path.join(projectDir, 'app/build/outputs');
  if (fs.existsSync(outputsDir)) {
    const found = walkFind(outputsDir, `.${ext}`);
    if (found) return found;
  }

  return null;
}

function walkFind(dir, ext) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const r = walkFind(full, ext);
      if (r) return r;
    } else if (entry.name.endsWith(ext)) {
      return full;
    }
  }
  return null;
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function updatePackageDeclarations(dir, packageName) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      updatePackageDeclarations(full, packageName);
    } else if (entry.name.endsWith('.java') || entry.name.endsWith('.kt')) {
      replaceInFile(full, [
        [/^package\s+com\.example\.webviewapp/m, `package ${packageName}`],
        [/import\s+com\.example\.webviewapp\./g, `import ${packageName}.`],
      ]);
    }
  }
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function darkenHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 0.8;
  const dr = Math.floor(r * factor).toString(16).padStart(2, '0');
  const dg = Math.floor(g * factor).toString(16).padStart(2, '0');
  const db = Math.floor(b * factor).toString(16).padStart(2, '0');
  return `#${dr}${dg}${db}`;
}

module.exports = { processBuild };
