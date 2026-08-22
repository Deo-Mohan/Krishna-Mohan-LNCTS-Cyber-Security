const net = require('net');
const config = require('./config');
const logger = require('./logger');

const mockStudents = [
  { id: '1001', name: 'Krishna Mohan', email: 'krishna.m@university.edu', major: 'Cyber Security', year: '4th' },
  { id: '1002', name: 'Alice Smith', email: 'alice.s@university.edu', major: 'Computer Science', year: '3rd' },
  { id: '1003', name: 'Bob Johnson', email: 'bob.j@university.edu', major: 'Information Technology', year: '2nd' }
];

async function checkDatabaseConnectivity() {
  return new Promise((resolve) => {
    logger.info(`Checking database connectivity to ${config.DB_HOST}:${config.DB_PORT}...`);
    
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(2000); // 2 second timeout for connection probe

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
  
  getStudents: async () => {
    const health = await checkDatabaseConnectivity();
    if (config.STRICT_DB_CHECK && health.status === 'disconnected') {
      throw new Error('Database is unavailable');
    }
    return mockStudents;
  }
};

module.exports = db;
