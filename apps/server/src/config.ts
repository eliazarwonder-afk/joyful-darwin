import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'collabflow-super-secret-jwt-key-change-in-prod-123!',
  jwtExpiresIn: '7d',
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), '.data'),
  exportsDir: process.env.EXPORTS_DIR || path.join(process.cwd(), '.data', 'exports'),
  redisUrl: process.env.REDIS_URL,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  rateLimitWindowMs: 60 * 1000,
};
