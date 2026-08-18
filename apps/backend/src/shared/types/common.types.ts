import { Request } from 'express';

export interface AuthUserPayload {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
