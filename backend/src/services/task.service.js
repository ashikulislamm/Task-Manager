import Task from '../models/Task.model.js';
import ApiError from '../utils/ApiError.js';

class TaskService {
  /**
   * Create a new task for a user
   */
  async createTask(taskData, userId) {
    const task = await Task.create({
      ...taskData,
      userId,
    });
    return task;
  }

  /**
   * Get all tasks of the authenticated user
   */
  async getAllTasks(userId) {
    return Task.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId, userId) {
    const task = await Task.findById(taskId).lean();
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    return task;
  }

  /**
   * Update task fields (title, description, status)
   */
  async updateTask(taskId, updateData, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    // Apply allowed updates
    const allowedUpdates = ['title', 'description', 'status'];
    allowedUpdates.forEach((key) => {
      if (updateData[key] !== undefined) {
        task[key] = updateData[key];
      }
    });

    const updatedTask = await task.save();
    return updatedTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    await Task.findByIdAndDelete(taskId);
    return task;
  }
}

export default new TaskService();
