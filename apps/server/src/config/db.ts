import mongoose from 'mongoose';
import { DB_NAME } from '@videotube/shared';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

/**
 * Connect to MongoDB.
 * Exits process on failure (let container orchestrator restart).
 */
export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(`${env.MONGODB_URI}/${DB_NAME}`);
    logger.info({ host: conn.connection.host }, 'MongoDB connected');
  } catch (err) {
    logger.fatal({ err }, 'MongoDB connection failed');
    process.exit(1);
  }
}

/**
 * Gracefully disconnect from MongoDB.
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
