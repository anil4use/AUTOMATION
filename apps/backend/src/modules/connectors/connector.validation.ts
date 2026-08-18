import { z } from 'zod';

export const createApiKeyConnectionSchema = z.object({
  connectorId: z.string().min(1),
  name: z.string().min(2),
  apiKey: z.string().min(8),
});

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
});
