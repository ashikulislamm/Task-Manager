import { Router } from 'express';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/task.controller.js';
import protect from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
} from '../validators/task.validation.js';

const router = Router();

// All task routes require authentication
router.use(protect);

router
  .route('/')
  .get(getAllTasks)
  .post(validate(createTaskSchema), createTask);

router
  .route('/:id')
  .all(validate(taskIdSchema)) // Validate MongoDB ObjectId format for tasks/:id path
  .get(getTaskById)
  .patch(validate(updateTaskSchema), updateTask)
  .delete(deleteTask);

export default router;
