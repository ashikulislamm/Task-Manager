import Task from '../models/Task.model.js';
import ApiError from '../utils/ApiError.js';
import activityService from './activity.service.js';

class TaskService {
  /**
   * Create a new task for a user
   */
  async createTask(taskData, userId) {
    const task = await Task.create({
      ...taskData,
      userId,
    });
    // Log activity
    await activityService.logActivity(userId, task._id, 'task_created', { title: task.title });
    return task;
  }

  /**
   * Get all tasks of the authenticated user with optional filtering/sorting
   */
  async getAllTasks(userId, query = {}) {
    const { status, priority, category, overdue, sort } = query;
    const queryObject = { userId };

    if (status) {
      queryObject.status = status;
    }
    if (priority) {
      queryObject.priority = priority;
    }
    if (category) {
      queryObject.category = category;
    }
    if (overdue === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      queryObject.dueDate = { $lt: today };
      queryObject.status = { $ne: 'done' };
    }

    let dbQuery = Task.find(queryObject);

    // Apply sorting in MongoDB
    if (sort === 'dueDate') {
      dbQuery = dbQuery.sort({ dueDate: 1, createdAt: -1 });
    } else if (sort === '-dueDate') {
      dbQuery = dbQuery.sort({ dueDate: -1, createdAt: -1 });
    } else {
      dbQuery = dbQuery.sort({ createdAt: -1 });
    }

    let tasks = await dbQuery.lean();

    // Custom sort in-memory for priorities
    if (sort === 'priority' || sort === '-priority') {
      const priorityWeights = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };
      tasks.sort((a, b) => {
        const weightA = priorityWeights[a.priority] || 2;
        const weightB = priorityWeights[b.priority] || 2;
        return sort === 'priority' ? weightA - weightB : weightB - weightA;
      });
    }

    return tasks;
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
   * Update task fields (title, description, status, priority, dueDate, category)
   */
  async updateTask(taskId, updateData, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    const oldStatus = task.status;
    const oldPriority = task.priority;
    const oldDueDate = task.dueDate;

    let statusChanged = false;
    let priorityChanged = false;
    let dueDateChanged = false;
    let generalUpdated = false;

    if (updateData.status !== undefined && updateData.status !== task.status) {
      statusChanged = true;
    }
    if (updateData.priority !== undefined && updateData.priority !== task.priority) {
      priorityChanged = true;
    }
    if (
      updateData.dueDate !== undefined &&
      (updateData.dueDate ? new Date(updateData.dueDate).getTime() : null) !== (task.dueDate ? new Date(task.dueDate).getTime() : null)
    ) {
      dueDateChanged = true;
    }
    if (
      (updateData.title !== undefined && updateData.title !== task.title) ||
      (updateData.description !== undefined && updateData.description !== task.description) ||
      (updateData.category !== undefined && updateData.category !== task.category)
    ) {
      generalUpdated = true;
    }

    // Apply allowed updates
    const allowedUpdates = [
      'title',
      'description',
      'status',
      'priority',
      'dueDate',
      'category',
      'isRecurring',
      'recurrenceType',
      'recurrenceEndDate',
    ];
    allowedUpdates.forEach((key) => {
      if (updateData[key] !== undefined) {
        task[key] = updateData[key];
      }
    });

    const wasCompleted = oldStatus !== 'done' && task.status === 'done';
    if (wasCompleted) {
      task.completedAt = new Date();
    } else if (task.status !== 'done') {
      task.completedAt = undefined;
    }

    const updatedTask = await task.save();

    // Log activities
    if (statusChanged) {
      await activityService.logActivity(userId, task._id, 'status_changed', {
        title: task.title,
        oldStatus,
        newStatus: task.status,
      });
    }
    if (priorityChanged) {
      await activityService.logActivity(userId, task._id, 'priority_changed', {
        title: task.title,
        oldPriority,
        newPriority: task.priority,
      });
    }
    if (dueDateChanged) {
      await activityService.logActivity(userId, task._id, 'due_date_changed', {
        title: task.title,
        oldDueDate,
        newDueDate: task.dueDate,
      });
    }
    if (generalUpdated && !statusChanged && !priorityChanged && !dueDateChanged) {
      await activityService.logActivity(userId, task._id, 'task_updated', {
        title: task.title,
      });
    }

    // Handle recurrence auto-generation
    if (wasCompleted && task.isRecurring) {
      await this.generateNextOccurrence(task, userId);
    }

    return updatedTask;
  }

  /**
   * Generate next occurrence for recurring task
   */
  async generateNextOccurrence(task, userId) {
    if (!task.isRecurring || !task.recurrenceType) return;

    const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const nextDueDate = new Date(baseDate);

    if (task.recurrenceType === 'daily') {
      nextDueDate.setDate(nextDueDate.getDate() + 1);
    } else if (task.recurrenceType === 'weekly') {
      nextDueDate.setDate(nextDueDate.getDate() + 7);
    } else if (task.recurrenceType === 'monthly') {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    // End date boundary check
    if (task.recurrenceEndDate && nextDueDate > new Date(task.recurrenceEndDate)) {
      console.log(`Recurrence end date reached for task "${task.title}". Skipping next occurrence.`);
      return;
    }

    const nextTask = await Task.create({
      title: task.title,
      description: task.description,
      status: 'todo',
      priority: task.priority || 'medium',
      category: task.category || 'personal',
      dueDate: nextDueDate,
      isRecurring: true,
      recurrenceType: task.recurrenceType,
      recurrenceEndDate: task.recurrenceEndDate,
      userId,
    });

    // Log activity
    await activityService.logActivity(userId, nextTask._id, 'task_created', {
      title: nextTask.title,
      isRecurrence: true,
      parentTaskId: task._id,
    });
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

    // Log activity
    await activityService.logActivity(userId, taskId, 'task_deleted', {
      title: task.title,
    });

    await Task.findByIdAndDelete(taskId);
    return task;
  }

  /**
   * Add a log to a task
   */
  async addTaskLog(taskId, content, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    task.logs.push({ content });
    await task.save();

    // Log activity
    await activityService.logActivity(userId, task._id, 'log_added', {
      title: task.title,
      contentSnippet: content.substring(0, 100),
    });

    return task;
  }

  /**
   * Delete a log from a task
   */
  async deleteTaskLog(taskId, logId, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    task.logs = task.logs.filter((log) => log._id.toString() !== logId.toString());
    await task.save();

    // Log activity
    await activityService.logActivity(userId, task._id, 'log_deleted', {
      title: task.title,
    });

    return task;
  }
}

export default new TaskService();
