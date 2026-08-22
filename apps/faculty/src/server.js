const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const db = require('./database');

const app = express();

app.use(express.json());
app.use(logger.middleware);

app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await db.checkHealth();
    const healthInfo = {
      status: dbStatus.status === 'disconnected' ? 'unhealthy' : 'healthy',
      application: config.APP_NAME,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus
      }
    };
    if (dbStatus.status === 'disconnected') {
      logger.error('Health check failed: Database connection is unavailable.');
      return res.status(503).json(healthInfo);
    }
    return res.status(200).json(healthInfo);
  } catch (err) {
    logger.error(`Health check exception: ${err.message}`);
    return res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// Fetch courses list
app.get('/api/faculty/courses', async (req, res) => {
  try {
    const courses = await db.getCourses();
    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (err) {
    logger.error(`API Error on /api/faculty/courses: ${err.message}`, { requestId: req.id });
    return res.status(500).json({
      success: false,
      error: 'Internal database service error'
    });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

const server = app.listen(config.PORT, '0.0.0.0', () => {
  logger.info(`Application started successfully on port ${config.PORT}`);
  logger.info(`Target database configured as ${config.DB_HOST}:${config.DB_PORT}`);
});

process.on('SIGTERM', () => {
  logger.warn('SIGTERM received. Shutting down...');
  server.close(() => {
    logger.info('Process terminated.');
  });
});
