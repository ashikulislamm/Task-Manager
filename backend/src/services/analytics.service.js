import Task from '../models/Task.model.js';
import FocusSession from '../models/FocusSession.model.js';

class AnalyticsService {
  async getOverview(userId) {
    const now = new Date();

    // 1. Calculate date ranges in local time
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    // Adjust so week starts on Monday
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // 2. Query all tasks of the user
    const tasks = await Task.find({ userId }).lean();

    // 3. Status and Priority counts
    const statusDistribution = {
      todo: 0,
      inProgress: 0,
      done: 0,
    };

    const priorityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalTasks = tasks.length;
    let completedTasks = 0;
    let weeklyCreated = 0;
    let weeklyCompleted = 0;
    let monthlyCreated = 0;
    let monthlyCompleted = 0;

    tasks.forEach((task) => {
      // Status mapping ('in-progress' -> 'inProgress')
      if (task.status === 'todo') statusDistribution.todo++;
      else if (task.status === 'in-progress') statusDistribution.inProgress++;
      else if (task.status === 'done') statusDistribution.done++;

      // Priority mapping
      const p = task.priority || 'medium';
      if (priorityDistribution[p] !== undefined) {
        priorityDistribution[p]++;
      }

      const createdAt = new Date(task.createdAt);
      const isDone = task.status === 'done';
      const completedAt = task.completedAt ? new Date(task.completedAt) : (isDone ? new Date(task.updatedAt) : null);

      if (isDone) {
        completedTasks++;
      }

      // Check weekly stats
      if (createdAt >= startOfWeek) {
        weeklyCreated++;
      }
      if (completedAt && completedAt >= startOfWeek) {
        weeklyCompleted++;
      }

      // Check monthly stats
      if (createdAt >= startOfMonth) {
        monthlyCreated++;
      }
      if (completedAt && completedAt >= startOfMonth) {
        monthlyCompleted++;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 4. Calculate trend charts data
    // Last 7 days trend
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      let created = 0;
      let completed = 0;

      tasks.forEach((task) => {
        const createdAt = new Date(task.createdAt);
        const isDone = task.status === 'done';
        const completedAt = task.completedAt ? new Date(task.completedAt) : (isDone ? new Date(task.updatedAt) : null);

        if (createdAt >= dayStart && createdAt <= dayEnd) {
          created++;
        }
        if (completedAt && completedAt >= dayStart && completedAt <= dayEnd) {
          completed++;
        }
      });

      weeklyTrend.push({ date: dateStr, created, completed });
    }

    // Last 30 days trend
    const monthlyTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      let created = 0;
      let completed = 0;

      tasks.forEach((task) => {
        const createdAt = new Date(task.createdAt);
        const isDone = task.status === 'done';
        const completedAt = task.completedAt ? new Date(task.completedAt) : (isDone ? new Date(task.updatedAt) : null);

        if (createdAt >= dayStart && createdAt <= dayEnd) {
          created++;
        }
        if (completedAt && completedAt >= dayStart && completedAt <= dayEnd) {
          completed++;
        }
      });

      monthlyTrend.push({ date: dateStr, created, completed });
    }

    // 5. Focus Analytics stats
    const focusSessions = await FocusSession.find({
      userId,
      status: 'completed',
    }).lean();

    let focusMinutesThisWeek = 0;
    let focusMinutesThisMonth = 0;
    let sessionsCompleted = focusSessions.length;

    focusSessions.forEach((session) => {
      const sessionDate = new Date(session.completedAt || session.updatedAt);
      if (sessionDate >= startOfWeek) {
        focusMinutesThisWeek += session.duration;
      }
      if (sessionDate >= startOfMonth) {
        focusMinutesThisMonth += session.duration;
      }
    });

    const focusHoursThisWeek = Math.round((focusMinutesThisWeek / 60) * 10) / 10;
    const focusHoursThisMonth = Math.round((focusMinutesThisMonth / 60) * 10) / 10;

    return {
      completionRate,
      totalTasks,
      completedTasks,
      overdueTasks: tasks.filter((t) => {
        if (!t.dueDate || t.status === 'done') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(t.dueDate) < today;
      }).length,
      weekly: {
        created: weeklyCreated,
        completed: weeklyCompleted,
      },
      monthly: {
        created: monthlyCreated,
        completed: monthlyCompleted,
      },
      statusDistribution,
      priorityDistribution,
      weeklyTrend,
      monthlyTrend,
      focus: {
        hoursThisWeek: focusHoursThisWeek,
        hoursThisMonth: focusHoursThisMonth,
        sessionsCompleted,
      },
    };
  }
}

export default new AnalyticsService();
