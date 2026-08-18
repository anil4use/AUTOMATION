import { Response } from 'express';

export function sendResponse<T>(res: Response, statusCode: number, success: boolean, data?: T, message?: string) {
  return res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}
