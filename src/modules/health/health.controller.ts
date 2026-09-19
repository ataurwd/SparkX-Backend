import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { TARGET_DB_NAME } from '../../config/db';

export function getHealth(req: Request, res: Response): void {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    service: 'SparkX Enterprise Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      type: 'MongoDB',
      status: dbStatus,
      activeDatabase: mongoose.connection.name || TARGET_DB_NAME,
      targetDatabase: TARGET_DB_NAME
    }
  });
}
