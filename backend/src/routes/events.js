/**
 * Server-Sent Events endpoint.
 *
 * The worker publishes log lines to Redis channel `build:{id}:logs`.
 * This route subscribes and forwards them to connected browser clients.
 *
 * GET /api/events/:buildId
 */
const express = require('express');
const IORedis = require('ioredis');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');

const router = express.Router();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

router.get('/:buildId', async (req, res) => {
  const { buildId } = req.params;

  const build = await prisma.build.findUnique({
    where: { id: buildId },
    select: { id: true, status: true },
  }).catch(() => null);

  if (!build) return res.status(404).json({ error: 'Build not found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  // Send current status immediately
  send('status', { status: build.status });

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { cleanup(); }
  }, 15_000);

  // Subscribe to build log channel via a dedicated Redis connection
  const subscriber = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

  const cleanup = () => {
    clearInterval(heartbeat);
    subscriber.unsubscribe().catch(() => {});
    subscriber.quit().catch(() => {});
  };

  subscriber.subscribe(`build:${buildId}:logs`, `build:${buildId}:status`, (err) => {
    if (err) {
      logger.warn('SSE subscribe failed', { buildId, error: err.message });
      cleanup();
      res.end();
    }
  });

  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);
      if (channel.endsWith(':logs')) {
        send('log', { line: data.line });
      } else if (channel.endsWith(':status')) {
        send('status', { status: data.status });
        if (data.status === 'SUCCESS' || data.status === 'FAILED') {
          cleanup();
          res.end();
        }
      }
    } catch {}
  });

  req.on('close', () => {
    cleanup();
  });
});

module.exports = router;
