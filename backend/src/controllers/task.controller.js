import taskService from '../services/task.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Create a new task
 */
export const createTask = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const task = await taskService.createTask(req.body, userId);
  res.status(201).json(new ApiResponse(201, 'Task created successfully', task));
});

/**
 * Get all tasks for the logged-in user
 */
export const getAllTasks = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { tasks, pagination } = await taskService.getAllTasks(userId, req.query);

  // Set pagination metadata in response headers for backwards compatibility with frontends
  res.set('X-Pagination-Total', pagination.totalTasks.toString());
  res.set('X-Pagination-Limit', pagination.limit.toString());
  res.set('X-Pagination-Page', pagination.currentPage.toString());
  res.set('X-Pagination-Pages', pagination.totalPages.toString());
  
  // Expose headers for cross-origin browser requests
  res.set('Access-Control-Expose-Headers', 'X-Pagination-Total, X-Pagination-Limit, X-Pagination-Page, X-Pagination-Pages');

  res.status(200).json(new ApiResponse(200, 'Tasks retrieved successfully', tasks));
});

/**
 * Get a single task by ID
 */
export const getTaskById = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user._id;
  const task = await taskService.getTaskById(taskId, userId);
  res.status(200).json(new ApiResponse(200, 'Task retrieved successfully', task));
});

/**
 * Update a task (title, description, or status)
 */
export const updateTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user._id;
  const updatedTask = await taskService.updateTask(taskId, req.body, userId);
  res.status(200).json(new ApiResponse(200, 'Task updated successfully', updatedTask));
});

/**
 * Delete a task
 */
export const deleteTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user._id;
  await taskService.deleteTask(taskId, userId);
  res.status(200).json(new ApiResponse(200, 'Task deleted successfully'));
});

/**
 * Add a work log to a task
 */
export const addTaskLog = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user._id;
  const { content } = req.body;
  const updatedTask = await taskService.addTaskLog(taskId, content, userId);
  res.status(201).json(new ApiResponse(201, 'Work log added successfully', updatedTask));
});

/**
 * Delete a work log from a task
 */
export const deleteTaskLog = asyncHandler(async (req, res) => {
  const { taskId, logId } = req.params;
  const userId = req.user._id;
  const updatedTask = await taskService.deleteTaskLog(taskId, logId, userId);
  res.status(200).json(new ApiResponse(200, 'Work log deleted successfully', updatedTask));
});

/**
 * Add a subtask to a task
 */
export const addSubtask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user._id;
  const task = await taskService.addSubtask(taskId, req.body, userId);
  res.status(201).json(new ApiResponse(201, 'Subtask added successfully', task));
});

/**
 * Update a subtask in a task
 */
export const updateSubtask = asyncHandler(async (req, res) => {
  const { taskId, subtaskId } = req.params;
  const userId = req.user._id;
  const task = await taskService.updateSubtask(taskId, subtaskId, req.body, userId);
  res.status(200).json(new ApiResponse(200, 'Subtask updated successfully', task));
});

/**
 * Delete a subtask from a task
 */
export const deleteSubtask = asyncHandler(async (req, res) => {
  const { taskId, subtaskId } = req.params;
  const userId = req.user._id;
  const task = await taskService.deleteSubtask(taskId, subtaskId, userId);
  res.status(200).json(new ApiResponse(200, 'Subtask deleted successfully', task));
});

/**
 * Toggle completion of a subtask
 */
export const toggleSubtask = asyncHandler(async (req, res) => {
  const { taskId, subtaskId } = req.params;
  const userId = req.user._id;
  const task = await taskService.toggleSubtask(taskId, subtaskId, userId);
  res.status(200).json(new ApiResponse(200, 'Subtask toggle status updated successfully', task));
});

