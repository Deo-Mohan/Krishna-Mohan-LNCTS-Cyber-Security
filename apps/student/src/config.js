const config = {
  APP_NAME: process.env.APP_NAME || 'student-portal',
  PORT: parseInt(process.env.PORT || '8081', 10),
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: process.env.DB_USER || 'student_user',
  DB_PASSWORD: process.env.DB_PASSWORD || '', // Default empty, must be passed via env
  DB_NAME: process.env.DB_NAME || 'student_db',
  SIEM_HOST: process.env.SIEM_HOST || '172.16.1.100',
  SIEM_PORT: parseInt(process.env.SIEM_PORT || '514', 10),
  STRICT_DB_CHECK: process.env.STRICT_DB_CHECK === 'true' // If true, health check fails if TCP socket connection fails
};

module.exports = config;
