const net = require('net');
const config = require('./config');
const logger = require('./logger');

const mockResearchProjects = [
  { id: 'RES-091', title: 'Post-Quantum Encryption Standards', principalInvestigator: 'Dr. Sarah Vance', classification: 'Restricted', activeResearchers: 5 },
  { id: 'RES-092', title: 'Intelligent Network Anomaly Clustering', principalInvestigator: 'Dr. Alan Turing', classification: 'Internal', activeResearchers: 3 },
  { id: 'RES-093', title: 'Distributed Ledger Core Security Protocols', principalInvestigator: 'Prof. Ada Lovelace', classification: 'Confidential', activeResearchers: 4 }
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
  
  getProjects: async () => {
    const health = await checkDatabaseConnectivity();
    if (config.STRICT_DB_CHECK && health.status === 'disconnected') {
      throw new Error('Database is unavailable');
    }
    return mockResearchProjects;
  }
};

module.exports = db;
