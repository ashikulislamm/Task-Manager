import analyticsService from '../services/analytics.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Get productivity analytics overview for the logged-in user
 */
export const getOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const overview = await analyticsService.getOverview(userId);
  res.status(200).json(new ApiResponse(200, 'Analytics retrieved successfully', overview));
});
