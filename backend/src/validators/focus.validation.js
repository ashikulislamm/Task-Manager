import { z } from 'zod';

export const startSessionSchema = z.object({
  body: z.object({
    taskId: z
      .string({ required_error: 'Task ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Task ID format. Must be a 24-character hex string.'),
    duration: z
      .preprocess((val) => Number(val), z.number({ required_error: 'Duration is required' }).positive('Duration must be a positive number')),
    subtaskId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Subtask ID format. Must be a 24-character hex string.')
      .optional()
      .nullable(),
  }),
});

export const endSessionSchema = z.object({
  body: z.object({
    status: z
      .enum(['completed', 'cancelled'], {
        invalid_type_error: 'Status must be completed or cancelled',
      })
      .optional(),
  }),
});
