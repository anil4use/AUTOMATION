import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`[Error] ${req.method} ${req.url}:`, err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
