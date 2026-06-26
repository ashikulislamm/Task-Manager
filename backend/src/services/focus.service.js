import FocusSession from '../models/FocusSession.model.js';
import Task from '../models/Task.model.js';
import ApiError from '../utils/ApiError.js';
import activityService from './activity.service.js';

class FocusService {
  /**
   * Start a new focus session
   */
  async startSession(userId, taskId, duration, subtaskId = null) {
    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    let subtaskTitle = '';
    if (subtaskId) {
      const subtask = task.subtasks.id(subtaskId) || task.subtasks.find(s => s._id.toString() === subtaskId.toString());
      if (!subtask) {
        throw new ApiError(404, 'Subtask not found on this task');
      }
      subtaskTitle = subtask.title;
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
      subtaskId: subtaskId || undefined,
      duration,
      status: 'active',
      startedAt: new Date(),
    });

    // Log activity
    await activityService.logActivity(userId, taskId, 'focus_started', {
      taskTitle: task.title,
      subtaskTitle: subtaskTitle || undefined,
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

    let subtaskTitle = undefined;
    if (task && session.subtaskId) {
      const subtask = task.subtasks.id(session.subtaskId) || task.subtasks.find(s => s._id.toString() === session.subtaskId.toString());
      if (subtask) {
        subtaskTitle = subtask.title;
      }
    }

    // Log activity
    await activityService.logActivity(userId, session.taskId, `focus_${endStatus}`, {
      taskTitle,
      subtaskTitle,
      duration: session.duration,
    });

    return session;
  }

  /**
   * Get the current active focus session for the user
   */
  async getCurrentSession(userId) {
    const session = await FocusSession.findOne({ userId, status: 'active' })
      .populate('taskId', 'title description status priority category subtasks')
      .lean();

    if (session && session.taskId && session.subtaskId) {
      const subtask = session.taskId.subtasks?.find(s => s._id.toString() === session.subtaskId.toString());
      if (subtask) {
        session.subtask = subtask;
      }
    }
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
