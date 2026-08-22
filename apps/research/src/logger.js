const config = require('./config');

function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function log(severity, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    application: config.APP_NAME,
    severity: severity,
    message: message,
    ...context
  };
  console.log(JSON.stringify(logEntry));
}

const logger = {
  info: (message, context) => log('INFO', message, context),
  warn: (message, context) => log('WARNING', message, context),
  error: (message, context) => log('ERROR', message, context),
  
  middleware: (req, res, next) => {
    req.id = req.headers['x-request-id'] || generateRequestId();
    const start = process.hrtime();
    const userHeader = req.headers['x-ztna-user'] || 'anonymous';
    
    res.on('finish', () => {
      const diff = process.hrtime(start);
      const durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
      
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
        requestId: req.id,
        user: userHeader,
        sourceIp: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        method: req.method,
        route: req.baseUrl + req.path,
        status: res.statusCode,
        durationMs: durationMs
      });
    });
    
    next();
  }
};

module.exports = logger;
