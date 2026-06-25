import focusService from '../services/focus.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

/**
 * Start a focus session
 */
export const startSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { taskId, duration } = req.body;

  if (!taskId) {
    throw new ApiError(400, 'Task ID is required');
  }
  if (!duration || isNaN(duration) || duration <= 0) {
    throw new ApiError(400, 'Duration must be a positive number');
  }

  const session = await focusService.startSession(userId, taskId, Number(duration));
  res.status(201).json(new ApiResponse(201, 'Focus session started successfully', session));
});

/**
 * End the current focus session
 */
export const endSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status = 'completed' } = req.body;

  if (!['completed', 'cancelled'].includes(status)) {
    throw new ApiError(400, 'Invalid ending status. Must be completed or cancelled.');
  }

  const session = await focusService.endSession(userId, status);
  res.status(200).json(new ApiResponse(200, `Focus session marked as ${status}`, session));
});

/**
 * Get active focus session
 */
export const getCurrentSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const session = await focusService.getCurrentSession(userId);
  res.status(200).json(new ApiResponse(200, 'Current focus session retrieved', session));
});

/**
 * Get focus session history
 */
export const getSessionHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const history = await focusService.getSessionHistory(userId);
  res.status(200).json(new ApiResponse(200, 'Focus session history retrieved', history));
});
