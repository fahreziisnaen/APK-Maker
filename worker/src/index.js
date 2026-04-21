require('dotenv').config({ path: '../backend/.env' });
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { logger } = require('./utils/logger');
const { processBuild } = require('./builder');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_BUILDS) || 3;

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

connection.on('connect', () => logger.info('Redis connected', { url: REDIS_URL }));
connection.on('error', (err) => {
  logger.error('Redis connection error', {
    message: err.message || String(err),
    code: err.code,
    url: REDIS_URL,
  });
});

const worker = new Worker('apk-builds', async (job) => {
  logger.info('Starting build job', { jobId: job.id, buildId: job.data.buildId });
  await processBuild(job);
}, {
  connection,
  concurrency: MAX_CONCURRENT,
});

worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id, buildId: job.data.buildId });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job?.id,
    buildId: job?.data?.buildId,
    error: err.message || String(err),
    stack: err.stack,
  });
});

worker.on('error', (err) => {
  // Log the full error so we can see what's actually wrong
  logger.error('Worker error', {
    message: err.message || String(err),
    code: err.code,
    stack: err.stack,
  });
});

logger.info(`Worker started, concurrency=${MAX_CONCURRENT}, redis=${REDIS_URL}`);

process.on('SIGTERM', async () => {
  logger.info('Shutting down worker...');
  await worker.close();
  process.exit(0);
});
