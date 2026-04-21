const validator = require('validator');

const BLOCKED_PRIVATE_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/10\.\d+\.\d+\.\d+/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/\[fc00:/i,
  /^https?:\/\/\[fd[0-9a-f]{2}:/i,
  /file:\/\//i,
  /javascript:/i,
];

const PACKAGE_NAME_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/;
const APP_NAME_RE = /^[a-zA-Z0-9 _\-'.]{1,50}$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validateUrl(url) {
  if (!url || typeof url !== 'string') return 'URL is required';
  if (url.length > 2048) return 'URL is too long';

  if (!validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
    return 'URL must be a valid http/https address';
  }

  for (const pattern of BLOCKED_PRIVATE_PATTERNS) {
    if (pattern.test(url)) {
      return 'Private/local network URLs are not allowed';
    }
  }

  return null;
}

function validatePackageName(pkg) {
  if (!pkg || typeof pkg !== 'string') return 'Package name is required';
  if (!PACKAGE_NAME_RE.test(pkg)) {
    return 'Package name must follow Java convention (e.g. com.example.myapp)';
  }
  if (pkg.length > 100) return 'Package name too long';
  return null;
}

function validateAppName(name) {
  if (!name || typeof name !== 'string') return 'App name is required';
  if (!APP_NAME_RE.test(name.trim())) {
    return 'App name must be 1–50 alphanumeric characters';
  }
  return null;
}

function validateThemeColor(color) {
  if (!color) return null; // optional
  if (!HEX_COLOR_RE.test(color)) return 'Theme color must be a hex color (e.g. #2563EB)';
  return null;
}

function validateBuildInput(body) {
  const errors = {};

  const urlError = validateUrl(body.websiteUrl);
  if (urlError) errors.websiteUrl = urlError;

  const nameError = validateAppName(body.appName);
  if (nameError) errors.appName = nameError;

  const pkgError = validatePackageName(body.packageName);
  if (pkgError) errors.packageName = pkgError;

  const colorError = validateThemeColor(body.themeColor);
  if (colorError) errors.themeColor = colorError;

  if (body.userAgent && typeof body.userAgent === 'string' && body.userAgent.length > 512) {
    errors.userAgent = 'User-agent string too long';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

module.exports = { validateBuildInput, validateUrl };
