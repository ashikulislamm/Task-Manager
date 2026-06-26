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
    const { status, priority, category, overdue, sort, page = 1, limit = 20 } = query;
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

    // Apply sorting in MongoDB using native indexes
    if (sort === 'dueDate') {
      dbQuery = dbQuery.sort({ dueDate: 1, createdAt: -1 });
    } else if (sort === '-dueDate') {
      dbQuery = dbQuery.sort({ dueDate: -1, createdAt: -1 });
    } else if (sort === 'priority') {
      dbQuery = dbQuery.sort({ priorityWeight: 1, createdAt: -1 });
    } else if (sort === '-priority') {
      dbQuery = dbQuery.sort({ priorityWeight: -1, createdAt: -1 });
    } else {
      dbQuery = dbQuery.sort({ createdAt: -1 });
    }

    // Apply offset pagination in MongoDB
    const skip = (Number(page) - 1) * Number(limit);
    dbQuery = dbQuery.skip(skip).limit(Number(limit));

    const [tasks, totalTasks] = await Promise.all([
      dbQuery.lean(),
      Task.countDocuments(queryObject),
    ]);

    return {
      tasks,
      pagination: {
        totalTasks,
        totalPages: Math.ceil(totalTasks / Number(limit)),
        currentPage: Number(page),
        limit: Number(limit),
      },
    };
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
      if (task.subtasks && task.subtasks.length > 0) {
        throw new ApiError(400, 'Cannot manually update status when subtasks exist');
      }
      statusChanged = true;
    }
    if (updateData.priority !== undefined && updateData.priority !== task.priority) {
      priorityChanged = true;
    }
    if (
      updateData.dueDate !== undefined &&
      (updateData.dueDate ? new Date(updateData.dueDate).getTime() : null) !== (task.dueDate ? new Date(task.dueDate).getTime() : null)
    ) {
      if (updateData.dueDate && task.subtasks && task.subtasks.length > 0) {
        const newParentDueDate = new Date(updateData.dueDate);
        const invalidSubtask = task.subtasks.find(
          (s) => s.dueDate && new Date(s.dueDate) > newParentDueDate
        );
        if (invalidSubtask) {
          throw new ApiError(
            400,
            `Cannot set parent due date earlier than subtask due date: "${invalidSubtask.title}"`
          );
        }
      }
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
      'dueTime',
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
      dueTime: task.dueTime,
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

  /**
   * Helper to recalculate parent task status based on subtasks completion
   */
  updateParentTaskStatus(task) {
    if (!task.subtasks || task.subtasks.length === 0) {
      return { statusChanged: false };
    }
    const total = task.subtasks.length;
    const completed = task.subtasks.filter((s) => s.completed).length;
    const oldStatus = task.status;

    let newStatus = 'todo';
    if (completed === total) {
      newStatus = 'done';
    } else if (completed > 0) {
      newStatus = 'in-progress';
    }

    if (task.status !== newStatus) {
      task.status = newStatus;
      if (newStatus === 'done') {
        task.completedAt = new Date();
      } else {
        task.completedAt = undefined;
      }
      return { statusChanged: true, oldStatus, newStatus };
    }
    return { statusChanged: false };
  }

  /**
   * Helper to save task and sync parent status side-effects
   */
  async saveTaskAndSync(task, userId) {
    const statusSync = this.updateParentTaskStatus(task);
    const updatedTask = await task.save();

    if (statusSync.statusChanged) {
      await activityService.logActivity(userId, task._id, 'status_changed', {
        title: task.title,
        oldStatus: statusSync.oldStatus,
        newStatus: statusSync.newStatus,
      });

      if (statusSync.newStatus === 'done' && task.isRecurring) {
        await this.generateNextOccurrence(task, userId);
      }
    }
    return updatedTask;
  }

  /**
   * Add a subtask to a task
   */
  async addSubtask(taskId, subtaskData, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }
    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    if (task.subtasks && task.subtasks.length >= 100) {
      throw new ApiError(400, 'Subtask limit reached. Maximum of 100 subtasks allowed.');
    }

    // Due date validation: subtaskDueDate <= parentDueDate
    if (subtaskData.dueDate && task.dueDate) {
      if (new Date(subtaskData.dueDate) > new Date(task.dueDate)) {
        throw new ApiError(400, 'Subtask due date cannot exceed parent task due date.');
      }
    }

    const newSubtask = {
      title: subtaskData.title,
      dueDate: subtaskData.dueDate ? new Date(subtaskData.dueDate) : undefined,
      completed: false,
      createdAt: new Date(),
    };

    task.subtasks.push(newSubtask);
    const updatedTask = await this.saveTaskAndSync(task, userId);

    const addedSubtask = updatedTask.subtasks[updatedTask.subtasks.length - 1];
    await activityService.logActivity(userId, task._id, 'subtask_created', {
      taskTitle: task.title,
      subtaskTitle: addedSubtask.title,
    });

    return updatedTask;
  }

  /**
   * Update a subtask
   */
  async updateSubtask(taskId, subtaskId, subtaskUpdateData, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }
    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      throw new ApiError(404, 'Subtask not found');
    }

    const oldCompleted = subtask.completed;
    const oldDueDate = subtask.dueDate;

    if (subtaskUpdateData.title !== undefined) {
      subtask.title = subtaskUpdateData.title;
    }

    // Due date validation
    if (subtaskUpdateData.dueDate !== undefined) {
      const newSubtaskDueDate = subtaskUpdateData.dueDate ? new Date(subtaskUpdateData.dueDate) : null;
      if (newSubtaskDueDate && task.dueDate && newSubtaskDueDate > new Date(task.dueDate)) {
        throw new ApiError(400, 'Subtask due date cannot exceed parent task due date.');
      }
      subtask.dueDate = newSubtaskDueDate || undefined;
    }

    let subtaskStatusLogged = false;
    if (subtaskUpdateData.completed !== undefined && subtaskUpdateData.completed !== subtask.completed) {
      subtask.completed = subtaskUpdateData.completed;
      subtask.completedAt = subtaskUpdateData.completed ? new Date() : undefined;
      subtaskStatusLogged = true;
    }

    const updatedTask = await this.saveTaskAndSync(task, userId);
    const updatedSubtask = updatedTask.subtasks.id(subtaskId);

    if (subtaskStatusLogged) {
      await activityService.logActivity(userId, task._id, updatedSubtask.completed ? 'subtask_completed' : 'subtask_reopened', {
        taskTitle: task.title,
        subtaskTitle: updatedSubtask.title,
      });
    }

    if (subtaskUpdateData.dueDate !== undefined &&
      (subtaskUpdateData.dueDate ? new Date(subtaskUpdateData.dueDate).getTime() : null) !== (oldDueDate ? new Date(oldDueDate).getTime() : null)) {
      await activityService.logActivity(userId, task._id, 'subtask_due_date_changed', {
        taskTitle: task.title,
        subtaskTitle: updatedSubtask.title,
        newDueDate: updatedSubtask.dueDate,
      });
    }

    return updatedTask;
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(taskId, subtaskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }
    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      throw new ApiError(404, 'Subtask not found');
    }

    const subtaskTitle = subtask.title;
    task.subtasks = task.subtasks.filter((s) => s._id.toString() !== subtaskId.toString());

    const updatedTask = await this.saveTaskAndSync(task, userId);

    await activityService.logActivity(userId, task._id, 'subtask_deleted', {
      taskTitle: task.title,
      subtaskTitle: subtaskTitle,
    });

    return updatedTask;
  }

  /**
   * Toggle completion of subtask
   */
  async toggleSubtask(taskId, subtaskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }
    if (task.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied. You do not own this task.');
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      throw new ApiError(404, 'Subtask not found');
    }

    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : undefined;

    const updatedTask = await this.saveTaskAndSync(task, userId);
    const updatedSubtask = updatedTask.subtasks.id(subtaskId);

    await activityService.logActivity(userId, task._id, updatedSubtask.completed ? 'subtask_completed' : 'subtask_reopened', {
      taskTitle: task.title,
      subtaskTitle: updatedSubtask.title,
    });

    return updatedTask;
  }
}

export default new TaskService();
