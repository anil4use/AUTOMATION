import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest, AuthUserPayload } from '../shared/types/common.types';
import { sendResponse } from '../shared/utils/response';

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  } else if (req.query.accessToken && typeof req.query.accessToken === 'string') {
    token = req.query.accessToken;
  }

  if (!token) {
    return sendResponse(res, 401, false, null, 'Unauthorized: Missing token');
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return sendResponse(res, 401, false, null, 'Unauthorized: Invalid token');
  }
}
