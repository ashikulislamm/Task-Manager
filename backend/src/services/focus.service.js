import FocusSession from '../models/FocusSession.model.js';
import Task from '../models/Task.model.js';
import ApiError from '../utils/ApiError.js';
import activityService from './activity.service.js';

class FocusService {
  /**
   * Start a new focus session
   */
  async startSession(userId, taskId, duration) {
    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    // Cancel any existing active focus sessions for this user
    await FocusSession.updateMany(
      { userId, status: 'active' },
      { status: 'cancelled', completedAt: new Date() }
    );

    // Create new active session
    const session = await FocusSession.create({
      userId,
      taskId,
      duration,
      status: 'active',
      startedAt: new Date(),
    });

    // Log activity
    await activityService.logActivity(userId, taskId, 'focus_started', {
      taskTitle: task.title,
      duration,
    });

    return session;
  }

  /**
   * End the current active focus session
   */
  async endSession(userId, endStatus = 'completed') {
    const session = await FocusSession.findOne({ userId, status: 'active' });
    if (!session) {
      throw new ApiError(404, 'No active focus session found');
    }

    session.status = endStatus;
    session.completedAt = new Date();
    await session.save();

    const task = await Task.findById(session.taskId);
    const taskTitle = task ? task.title : 'Deleted Task';

    // Log activity
    await activityService.logActivity(userId, session.taskId, `focus_${endStatus}`, {
      taskTitle,
      duration: session.duration,
    });

    return session;
  }

  /**
   * Get the current active focus session for the user
   */
  async getCurrentSession(userId) {
    const session = await FocusSession.findOne({ userId, status: 'active' })
      .populate('taskId', 'title description status priority category')
      .lean();
    return session;
  }

  /**
   * Get focus session history for the user
   */
  async getSessionHistory(userId) {
    const history = await FocusSession.find({ userId })
      .sort({ startedAt: -1 })
      .populate('taskId', 'title')
      .limit(50)
      .lean();
    return history;
  }
}

export default new FocusService();
