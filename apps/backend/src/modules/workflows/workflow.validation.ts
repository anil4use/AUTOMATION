import { z } from 'zod';

export const createWorkflowSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  definition: z
    .object({
      nodes: z.array(z.any()).default([]),
      edges: z.array(z.any()).default([]),
    })
    .optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
  definition: z
    .object({
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
    })
    .optional(),
});
