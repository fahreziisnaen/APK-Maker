const rateLimit = require('express-rate-limit');

function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: options.message || { error: 'Too many requests' },
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  });
}

module.exports = { createRateLimiter };
