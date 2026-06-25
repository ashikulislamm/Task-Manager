import Activity from '../models/Activity.model.js';

class ActivityService {
  /**
   * Log a new activity in the database
   */
  async logActivity(userId, taskId, action, metadata = {}) {
    try {
      const activity = await Activity.create({
        userId,
        taskId,
        action,
        metadata,
      });
      return activity;
    } catch (err) {
      console.error('Error logging activity:', err);
      // Fail silently to prevent crashing the main task operations
    }
  }

  /**
   * Get paginated activities for a user
   */
  async getActivities(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [activities, totalActivities] = await Promise.all([
      Activity.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('taskId', 'title') // Populate task title if task still exists
        .lean(),
      Activity.countDocuments({ userId }),
    ]);

    const totalPages = Math.ceil(totalActivities / limit);

    return {
      activities,
      totalPages,
      currentPage: Number(page),
      totalActivities,
    };
  }
}

export default new ActivityService();
