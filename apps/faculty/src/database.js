const net = require('net');
const config = require('./config');
const logger = require('./logger');

const mockCourses = [
  { code: 'SEC-401', name: 'Applied Cryptography', schedule: 'Mon/Wed 10:00 AM', room: 'Lab 3B', enrolledCount: 28 },
  { code: 'SEC-402', name: 'Intrusion Detection and Prevention', schedule: 'Tue/Thu 1:30 PM', room: 'Auditorium A', enrolledCount: 35 },
  { code: 'SEC-403', name: 'Software Security & Secure Coding', schedule: 'Fri 9:00 AM', room: 'Seminar Room 2', enrolledCount: 22 }
];

async function checkDatabaseConnectivity() {
  return new Promise((resolve) => {
    logger.info(`Checking database connectivity to ${config.DB_HOST}:${config.DB_PORT}...`);
    
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      if (!isResolved) {
        isResolved = true;
        logger.info('Database network connection check: SUCCESSFUL.');
        resolve({ status: 'connected', mock: false });
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      if (!isResolved) {
        isResolved = true;
        logger.warn(`Database network connection check: TIMEOUT connecting to ${config.DB_HOST}:${config.DB_PORT}.`);
        resolve({ status: config.STRICT_DB_CHECK ? 'disconnected' : 'mocked', mock: true });
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      if (!isResolved) {
        isResolved = true;
        logger.warn(`Database network connection check: FAILED (${err.message}) connecting to ${config.DB_HOST}:${config.DB_PORT}.`);
        resolve({ status: config.STRICT_DB_CHECK ? 'disconnected' : 'mocked', mock: true });
      }
    });

    socket.connect(config.DB_PORT, config.DB_HOST);
  });
}

const db = {
  checkHealth: async () => {
    const conn = await checkDatabaseConnectivity();
    return conn;
  },
  
  getCourses: async () => {
    const health = await checkDatabaseConnectivity();
    if (config.STRICT_DB_CHECK && health.status === 'disconnected') {
      throw new Error('Database is unavailable');
    }
    return mockCourses;
  }
};

module.exports = db;
