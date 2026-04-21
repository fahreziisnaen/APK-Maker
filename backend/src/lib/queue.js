const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { logger } = require('../utils/logger');

let connection;
let buildQueue;

function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => logger.error('Redis error', { error: err.message }));
  }
  return connection;
}

function getBuildQueue() {
  if (!buildQueue) {
    buildQueue = new Queue('apk-builds', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return buildQueue;
}

async function enqueueBuild(buildId, payload) {
  const queue = getBuildQueue();
  const job = await queue.add('build', { buildId, ...payload }, {
    jobId: buildId,
    timeout: parseInt(process.env.BUILD_TIMEOUT_MS) || 300_000,
  });
  logger.info('Build enqueued', { buildId, jobId: job.id });
  return job.id;
}

module.exports = { getBuildQueue, getRedisConnection, enqueueBuild };
