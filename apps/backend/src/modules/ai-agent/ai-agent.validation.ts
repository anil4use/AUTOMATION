import { z } from 'zod';

export const generateWorkflowSchema = z.object({
  prompt: z.string().min(5),
  niche: z.string().optional(),
});
