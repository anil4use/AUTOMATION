import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendResponse } from '../shared/utils/response';

export function validationMiddleware(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      return sendResponse(res, 400, false, err.errors, 'Validation Failed');
    }
  };
}
