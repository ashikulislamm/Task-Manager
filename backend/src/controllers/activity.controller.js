import activityService from '../services/activity.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Get paginated activity timeline for the logged-in user
 */
export const getActivities = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const result = await activityService.getActivities(
    userId,
    Number(page),
    Number(limit)
  );

  res.status(200).json(new ApiResponse(200, 'Activities retrieved successfully', result));
});
