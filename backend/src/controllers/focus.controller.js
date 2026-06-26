import focusService from '../services/focus.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Start a focus session (Zod validated)
 */
export const startSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { taskId, duration, subtaskId } = req.body;

  const session = await focusService.startSession(userId, taskId, duration, subtaskId);
  res.status(201).json(new ApiResponse(201, 'Focus session started successfully', session));
});

/**
 * End the current focus session (Zod validated)
 */
export const endSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status = 'completed' } = req.body;

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
