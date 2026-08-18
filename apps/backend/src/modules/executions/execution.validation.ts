import { z } from 'zod';

export const queryExecutionLogSchema = z.object({
  workflowId: z.string().optional(),
  status: z.string().optional(),
});
