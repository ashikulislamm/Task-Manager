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
    priority: z
      .enum(['low', 'medium', 'high', 'critical'], {
        invalid_type_error: 'Priority must be one of: low, medium, high, critical',
      })
      .optional(),
    category: z
      .enum(['work', 'personal', 'study', 'health'], {
        invalid_type_error: 'Category must be one of: work, personal, study, health',
      })
      .optional(),
    dueDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid due date format',
      })
      .optional()
      .nullable(),
    dueTime: z.string().optional().nullable(),
    isRecurring: z.boolean().optional(),
    recurrenceType: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
    recurrenceEndDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid end date format',
      })
      .optional()
      .nullable(),
  }).refine((data) => !data.isRecurring || !!data.recurrenceType, {
    message: 'Recurrence type is required when task is recurring',
    path: ['recurrenceType'],
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
    priority: z
      .enum(['low', 'medium', 'high', 'critical'], {
        invalid_type_error: 'Priority must be one of: low, medium, high, critical',
      })
      .optional(),
    category: z
      .enum(['work', 'personal', 'study', 'health'], {
        invalid_type_error: 'Category must be one of: work, personal, study, health',
      })
      .optional(),
    dueDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid due date format',
      })
      .optional()
      .nullable(),
    dueTime: z.string().optional().nullable(),
    isRecurring: z.boolean().optional(),
    recurrenceType: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
    recurrenceEndDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid end date format',
      })
      .optional()
      .nullable(),
  }).refine((data) => !data.isRecurring || !!data.recurrenceType, {
    message: 'Recurrence type is required when task is recurring',
    path: ['recurrenceType'],
  }),
});

export const createLogSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'Log content is required' })
      .trim()
      .min(1, 'Log content cannot be empty')
      .max(500, 'Log content must be at most 500 characters'),
  }),
});

export const deleteLogSchema = z.object({
  params: z.object({
    taskId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format. Must be a 24-character hex string.'),
    logId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid log ID format. Must be a 24-character hex string.'),
  }),
});

export const taskIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format. Must be a 24-character hex string.'),
  }),
});

export const subtaskParamsSchema = z.object({
  params: z.object({
    taskId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format. Must be a 24-character hex string.'),
    subtaskId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid subtask ID format. Must be a 24-character hex string.'),
  }),
});

export const addSubtaskSchema = z.object({
  params: z.object({
    taskId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format. Must be a 24-character hex string.'),
  }),
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be at most 100 characters'),
    dueDate: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid due date format',
      })
      .optional()
      .nullable(),
  }),
});

export const updateSubtaskSchema = z.object({
  params: z.object({
    taskId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format. Must be a 24-character hex string.'),
    subtaskId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid subtask ID format. Must be a 24-character hex string.'),
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be at most 100 characters')
      .optional(),
    completed: z.boolean().optional(),
    dueDate: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid due date format',
      })
      .optional()
      .nullable(),
  }),
});

export const tasksQuerySchema = z.object({
  query: z.object({
    status: z.enum(TASK_STATUS_LIST, {
      invalid_type_error: `Status must be one of: ${TASK_STATUS_LIST.join(', ')}`,
    }).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical'], {
      invalid_type_error: 'Priority must be one of: low, medium, high, critical',
    }).optional(),
    category: z.enum(['work', 'personal', 'study', 'health'], {
      invalid_type_error: 'Category must be one of: work, personal, study, health',
    }).optional(),
    overdue: z.enum(['true', 'false']).optional(),
    sort: z.enum(['dueDate', '-dueDate', 'priority', '-priority', 'createdAt', '-createdAt']).optional(),
    page: z.preprocess((val) => (val ? Number(val) : 1), z.number().min(1).default(1)),
    limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().min(1).max(100).default(20)),
  }),
});

