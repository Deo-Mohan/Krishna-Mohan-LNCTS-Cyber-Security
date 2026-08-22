const config = {
  APP_NAME: process.env.APP_NAME || 'faculty-portal',
  PORT: parseInt(process.env.PORT || '8082', 10),
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'faculty_user',
  DB_PASSWORD: process.env.DB_PASSWORD || '', // Dynamic, empty default
  DB_NAME: process.env.DB_NAME || 'faculty_db',
  SIEM_HOST: process.env.SIEM_HOST || '172.16.1.100',
  SIEM_PORT: parseInt(process.env.SIEM_PORT || '514', 10),
  STRICT_DB_CHECK: process.env.STRICT_DB_CHECK === 'true'
};

module.exports = config;
