const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const db = require('./database');

const app = express();

app.use(express.json());
app.use(logger.middleware);

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Health and Readiness Endpoint
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

// REST API endpoint: Get student lists
app.get('/api/students', async (req, res) => {
  try {
    const students = await db.getStudents();
    return res.status(200).json({
      success: true,
      data: students
    });
  } catch (err) {
    logger.error(`API Error on /api/students: ${err.message}`, { requestId: req.id });
    return res.status(500).json({
      success: false,
      error: 'Internal service dependency error'
    });
  }
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Start the server
const server = app.listen(config.PORT, '0.0.0.0', () => {
  logger.info(`Application started successfully on port ${config.PORT}`);
  logger.info(`Target database configured as ${config.DB_HOST}:${config.DB_PORT}`);
});

process.on('SIGTERM', () => {
  logger.warn('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
  });
});
