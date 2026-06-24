import { z } from 'zod';
import { TASK_STATUS_LIST } from '../constants/taskStatus.js';

export const createTaskSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be at most 100 characters'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description cannot be empty'),
    status: z
      .enum(TASK_STATUS_LIST, {
        invalid_type_error: `Status must be one of: ${TASK_STATUS_LIST.join(', ')}`,
      })
      .optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be at most 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .min(1, 'Description cannot be empty')
      .optional(),
    status: z
      .enum(TASK_STATUS_LIST, {
        invalid_type_error: `Status must be one of: ${TASK_STATUS_LIST.join(', ')}`,
      })
      .optional(),
  }),
});

export const taskIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format. Must be a 24-character hex string.'),
  }),
});
