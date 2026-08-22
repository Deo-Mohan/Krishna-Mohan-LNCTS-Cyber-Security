const net = require('net');
const config = require('./config');
const logger = require('./logger');

const mockExamQuestions = [
  { id: 1, subject: 'Network Security', question: 'Explain the difference between Symmetric and Asymmetric Cryptography.', type: 'Essay', points: 10 },
  { id: 2, subject: 'Kubernetes Hardening', question: 'Which Pod Security Standard context parameter prevents writing code scripts to local runtime storage?', choices: ['runAsNonRoot: true', 'allowPrivilegeEscalation: false', 'readOnlyRootFilesystem: true'], answer: 'readOnlyRootFilesystem: true', points: 5 },
  { id: 3, subject: 'Zero Trust Architecture', question: 'Name the three core tenets of a Zero-Trust network.', type: 'Short Answer', points: 10 }
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
  
  getQuestions: async () => {
    const health = await checkDatabaseConnectivity();
    if (config.STRICT_DB_CHECK && health.status === 'disconnected') {
      throw new Error('Database is unavailable');
    }
    return mockExamQuestions;
  }
};

module.exports = db;
