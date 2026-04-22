require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { logger } = require('./utils/logger');
const buildsRouter = require('./routes/builds');
const eventsRouter = require('./routes/events');
const proxyRouter = require('./routes/proxy');

const app = express();
const PORT = process.env.PORT || 4001;

// Ensure storage directory exists
const storageDir = process.env.STORAGE_DIR || './storage';
fs.mkdirSync(path.resolve(storageDir), { recursive: true });
fs.mkdirSync(path.resolve(storageDir, 'uploads'), { recursive: true });
fs.mkdirSync(path.resolve(storageDir, 'apks'), { recursive: true });

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:4000').split(','),
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/builds', buildsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/proxy', proxyRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve APK files (with validation)
app.use('/api/downloads', (req, res, next) => {
  // Prevent path traversal
  const safePath = path.normalize(req.path).replace(/^(\.\.(\/|\\|$))+/, '');
  req.url = safePath;
  next();
}, express.static(path.resolve(storageDir, 'apks'), {
  dotfiles: 'deny',
  index: false,
}));

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(PORT, () => {
  logger.info(`Backend running on port ${PORT}`);
});

module.exports = app;
