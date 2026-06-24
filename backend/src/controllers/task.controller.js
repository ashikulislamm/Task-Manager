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
  const tasks = await taskService.getAllTasks(userId);
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
