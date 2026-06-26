import { Router } from 'express';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addTaskLog,
  deleteTaskLog,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  toggleSubtask,
} from '../controllers/task.controller.js';
import protect from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  createLogSchema,
  deleteLogSchema,
  addSubtaskSchema,
  updateSubtaskSchema,
  subtaskParamsSchema,
  tasksQuerySchema,
} from '../validators/task.validation.js';

const router = Router();

// All task routes require authentication
router.use(protect);

router
  .route('/')
  .get(validate(tasksQuerySchema), getAllTasks)
  .post(validate(createTaskSchema), createTask);

router
  .route('/:id')
  .all(validate(taskIdSchema)) // Validate MongoDB ObjectId format for tasks/:id path
  .get(getTaskById)
  .patch(validate(updateTaskSchema), updateTask)
  .delete(deleteTask);

// Dedicated endpoints for work logs
router.post('/:id/logs', validate(taskIdSchema), validate(createLogSchema), addTaskLog);
router.delete('/:taskId/logs/:logId', validate(deleteLogSchema), deleteTaskLog);

// Dedicated endpoints for subtasks
router.post('/:taskId/subtasks', validate(addSubtaskSchema), addSubtask);
router.patch('/:taskId/subtasks/:subtaskId', validate(updateSubtaskSchema), updateSubtask); // Cleaned redundant validator
router.delete('/:taskId/subtasks/:subtaskId', validate(subtaskParamsSchema), deleteSubtask);
router.patch('/:taskId/subtasks/:subtaskId/toggle', validate(subtaskParamsSchema), toggleSubtask);

export default router;
