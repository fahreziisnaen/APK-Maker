const IORedis = require('ioredis');

let publisher;

function getPublisher() {
  if (!publisher) {
    publisher = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }
  return publisher;
}

async function publishLog(buildId, line) {
  await getPublisher().publish(`build:${buildId}:logs`, JSON.stringify({ line }));
}

async function publishStatus(buildId, status) {
  await getPublisher().publish(`build:${buildId}:status`, JSON.stringify({ status }));
}

module.exports = { publishLog, publishStatus };
