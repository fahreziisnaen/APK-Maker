const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { prisma } = require('../lib/prisma');
const { enqueueBuild } = require('../lib/queue');
const { validateBuildInput } = require('../utils/validate');
const { logger } = require('../utils/logger');

const router = express.Router();

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');

// Multer — memory storage so we can validate before writing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// POST /api/builds — create & enqueue a new build
router.post('/', upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'splash', maxCount: 1 },
]), async (req, res) => {
  try {
    const body = req.body;

    // Validation
    const errors = validateBuildInput(body);
    if (errors) {
      return res.status(422).json({ error: 'Validation failed', details: errors });
    }

    const buildId = uuidv4();
    const uploadDir = path.join(UPLOADS_DIR, buildId);
    fs.mkdirSync(uploadDir, { recursive: true });

    // Process and save icon
    let iconPath = null;
    if (req.files?.icon?.[0]) {
      iconPath = path.join(uploadDir, 'icon.png');
      await sharp(req.files.icon[0].buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(iconPath);
      iconPath = path.relative(STORAGE_DIR, iconPath);
    }

    // Process and save splash
    let splashPath = null;
    if (req.files?.splash?.[0]) {
      splashPath = path.join(uploadDir, 'splash.png');
      await sharp(req.files.splash[0].buffer)
        .resize(1080, 1920, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toFile(splashPath);
      splashPath = path.relative(STORAGE_DIR, splashPath);
    }

    // Persist build record
    const build = await prisma.build.create({
      data: {
        id: buildId,
        appName: body.appName.trim(),
        packageName: body.packageName.trim().toLowerCase(),
        websiteUrl: body.websiteUrl.trim(),
        themeColor: body.themeColor || '#2563EB',
        userAgent: body.userAgent?.trim() || null,
        enablePushNotifications: body.enablePushNotifications === 'true',
        enablePullToRefresh: body.enablePullToRefresh !== 'false',
        enableOfflineFallback: body.enableOfflineFallback === 'true',
        buildAab: body.buildAab === 'true',
        iconPath,
        splashPath,
        status: 'QUEUED',
        ipAddress: req.ip,
      },
    });

    // Enqueue build job
    const jobId = await enqueueBuild(buildId, {
      appName: build.appName,
      packageName: build.packageName,
      websiteUrl: build.websiteUrl,
      themeColor: build.themeColor,
      userAgent: build.userAgent,
      iconPath: build.iconPath,
      splashPath: build.splashPath,
      enablePushNotifications: build.enablePushNotifications,
      enablePullToRefresh: build.enablePullToRefresh,
      enableOfflineFallback: build.enableOfflineFallback,
      buildAab: build.buildAab,
    });

    await prisma.build.update({ where: { id: buildId }, data: { jobId } });

    logger.info('Build created', { buildId });
    res.status(201).json({ id: buildId, status: 'QUEUED' });
  } catch (err) {
    logger.error('Failed to create build', { error: err.message });
    res.status(500).json({ error: 'Failed to create build' });
  }
});

// GET /api/builds/:id — poll build status
router.get('/:id', async (req, res) => {
  try {
    const build = await prisma.build.findUnique({ where: { id: req.params.id } });
    if (!build) return res.status(404).json({ error: 'Build not found' });

    res.json({
      id: build.id,
      status: build.status,
      appName: build.appName,
      packageName: build.packageName,
      websiteUrl: build.websiteUrl,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      logs: build.logs ? build.logs.split('\n') : [],
      errorMessage: build.errorMessage,
      downloadUrl: build.outputPath ? `/api/downloads/${path.basename(build.outputPath)}` : null,
      outputSize: build.outputSize,
    });
  } catch (err) {
    logger.error('Failed to get build', { error: err.message });
    res.status(500).json({ error: 'Failed to get build' });
  }
});

// GET /api/builds — list recent builds (last 20)
router.get('/', async (req, res) => {
  try {
    const builds = await prisma.build.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, appName: true, packageName: true, websiteUrl: true,
        status: true, createdAt: true, outputSize: true,
      },
    });
    res.json(builds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list builds' });
  }
});

// GET /api/builds/:id/download — redirect to APK file
router.get('/:id/download', async (req, res) => {
  try {
    const build = await prisma.build.findUnique({ where: { id: req.params.id } });
    if (!build || build.status !== 'SUCCESS' || !build.outputPath) {
      return res.status(404).json({ error: 'APK not ready or not found' });
    }

    const filename = path.basename(build.outputPath);
    res.redirect(`/api/downloads/${filename}`);
  } catch (err) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// PATCH /api/builds/:id/worker — internal endpoint used by the worker service
// to update build state (status, logs, result). No public auth needed because
// this route is only reachable from inside the Docker network.
router.patch('/:id/worker', async (req, res) => {
  try {
    const { status, log, errorMessage, outputPath, outputSize } = req.body;
    const data = {};

    if (status !== undefined) data.status = status;
    if (errorMessage !== undefined) data.errorMessage = errorMessage;
    if (outputPath !== undefined) data.outputPath = outputPath;
    if (outputSize !== undefined) data.outputSize = outputSize;

    if (log !== undefined) {
      // Append log line to existing logs, keep last 200 lines
      const build = await prisma.build.findUnique({ where: { id: req.params.id }, select: { logs: true } });
      const lines = (build?.logs || '').split('\n').filter(Boolean);
      lines.push(log);
      data.logs = lines.slice(-200).join('\n');
    }

    await prisma.build.update({ where: { id: req.params.id }, data });
    res.json({ ok: true });
  } catch (err) {
    logger.error('Worker update failed', { error: err.message });
    res.status(500).json({ error: 'Failed to update build' });
  }
});

// DELETE /api/builds/:id — clean up a build
router.delete('/:id', async (req, res) => {
  try {
    const build = await prisma.build.findUnique({ where: { id: req.params.id } });
    if (!build) return res.status(404).json({ error: 'Build not found' });

    // Clean up files
    const uploadDir = path.join(UPLOADS_DIR, req.params.id);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
    if (build.outputPath) {
      const apkFile = path.join(STORAGE_DIR, build.outputPath);
      if (fs.existsSync(apkFile)) fs.unlinkSync(apkFile);
    }

    await prisma.build.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete build' });
  }
});

module.exports = router;
