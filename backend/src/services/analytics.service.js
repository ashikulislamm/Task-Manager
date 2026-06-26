import mongoose from 'mongoose';
import Task from '../models/Task.model.js';
import FocusSession from '../models/FocusSession.model.js';

class AnalyticsService {
  async getOverview(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    // 1. Calculate date ranges in local time
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    // Adjust so week starts on Monday
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 2. Run database aggregations in parallel
    const [taskStats, focusStats, trendData] = await Promise.all([
      // Aggregation 1: Comprehensive task counts and classifications
      Task.aggregate([
        { $match: { userId: userObjectId } },
        {
          $facet: {
            general: [
              {
                $group: {
                  _id: null,
                  totalTasks: { $sum: 1 },
                  completedTasks: {
                    $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                  },
                  totalSubtasks: { $sum: { $size: { $ifNull: ['$subtasks', []] } } },
                  completedSubtasks: {
                    $sum: {
                      $size: {
                        $filter: {
                          input: { $ifNull: ['$subtasks', []] },
                          as: 'sub',
                          cond: { $eq: ['$$sub.completed', true] }
                        }
                      }
                    }
                  },
                  sumOfTaskProgress: { $sum: '$progressPercentage' },
                  overdueTasks: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $ne: ['$status', 'done'] },
                            { $ifNull: ['$dueDate', false] },
                            { $lt: ['$dueDate', todayStart] }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  weeklyCreated: {
                    $sum: { $cond: [{ $gte: ['$createdAt', startOfWeek] }, 1, 0] }
                  },
                  weeklyCompleted: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$status', 'done'] },
                            { $gte: [{ $ifNull: ['$completedAt', '$updatedAt'] }, startOfWeek] }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  monthlyCreated: {
                    $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0] }
                  },
                  monthlyCompleted: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$status', 'done'] },
                            { $gte: [{ $ifNull: ['$completedAt', '$updatedAt'] }, startOfMonth] }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              }
            ],
            statusDist: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            priorityDist: [
              { $group: { _id: '$priority', count: { $sum: 1 } } }
            ],
            categoryCompleted: [
              { $match: { status: 'done' } },
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 1 }
            ],
            priorityCompleted: [
              { $match: { status: 'done' } },
              { $group: { _id: '$priority', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 1 }
            ]
          }
        }
      ]),

      // Aggregation 2: Focus statistics
      FocusSession.aggregate([
        { $match: { userId: userObjectId, status: 'completed' } },
        {
          $group: {
            _id: null,
            sessionsCompleted: { $sum: 1 },
            focusMinutesThisWeek: {
              $sum: {
                $cond: [
                  { $gte: [{ $ifNull: ['$completedAt', '$updatedAt'] }, startOfWeek] },
                  '$duration',
                  0
                ]
              }
            },
            focusMinutesThisMonth: {
              $sum: {
                $cond: [
                  { $gte: [{ $ifNull: ['$completedAt', '$updatedAt'] }, startOfMonth] },
                  '$duration',
                  0
                ]
              }
            }
          }
        }
      ]),

      // Aggregation 3: Fetch task dates for last 30 days trends (highly projected, fast)
      Task.aggregate([
        {
          $match: {
            userId: userObjectId,
            $or: [
              { createdAt: { $gte: thirtyDaysAgo } },
              { completedAt: { $gte: thirtyDaysAgo } }
            ]
          }
        },
        {
          $project: {
            createdDate: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            completedDate: {
              $cond: [
                { $eq: ['$status', 'done'] },
                { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$completedAt', '$updatedAt'] } } },
                null
              ]
            }
          }
        }
      ])
    ]);

    // 3. Extract and sanitize aggregation results
    const rawStats = taskStats[0]?.general[0] || {
      totalTasks: 0,
      completedTasks: 0,
      totalSubtasks: 0,
      completedSubtasks: 0,
      sumOfTaskProgress: 0,
      overdueTasks: 0,
      weeklyCreated: 0,
      weeklyCompleted: 0,
      monthlyCreated: 0,
      monthlyCompleted: 0,
    };

    const totalTasks = rawStats.totalTasks;
    const completedTasks = rawStats.completedTasks;
    const totalSubtasks = rawStats.totalSubtasks;
    const completedSubtasks = rawStats.completedSubtasks;
    const sumOfTaskProgress = rawStats.sumOfTaskProgress;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const subtaskCompletionRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    const averageTaskProgress = totalTasks > 0 ? Math.round(sumOfTaskProgress / totalTasks) : 0;

    // Parse status distribution
    const statusDistribution = { todo: 0, inProgress: 0, done: 0 };
    (taskStats[0]?.statusDist || []).forEach((item) => {
      if (item._id === 'todo') statusDistribution.todo = item.count;
      else if (item._id === 'in-progress') statusDistribution.inProgress = item.count;
      else if (item._id === 'done') statusDistribution.done = item.count;
    });

    // Parse priority distribution
    const priorityDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
    (taskStats[0]?.priorityDist || []).forEach((item) => {
      const pr = item._id || 'medium';
      if (priorityDistribution[pr] !== undefined) {
        priorityDistribution[pr] = item.count;
      }
    });

    // Determine productive category and completed priority
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const rawCategory = taskStats[0]?.categoryCompleted[0]?._id;
    const mostProductiveCategory = rawCategory ? capitalize(rawCategory) : 'None';

    const rawPriority = taskStats[0]?.priorityCompleted[0]?._id;
    const mostCompletedPriority = rawPriority ? capitalize(rawPriority) : 'None';

    // 4. Generate trend series data using timezone-aligned date mapping
    const trendMap = new Map();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStrKey = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      const dateStrLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      trendMap.set(dateStrKey, { label: dateStrLabel, created: 0, completed: 0 });
    }

    (trendData || []).forEach((item) => {
      if (item.createdDate && trendMap.has(item.createdDate)) {
        trendMap.get(item.createdDate).created++;
      }
      if (item.completedDate && trendMap.has(item.completedDate)) {
        trendMap.get(item.completedDate).completed++;
      }
    });

    const monthlyTrend = Array.from(trendMap.values()).map((val) => ({
      date: val.label,
      created: val.created,
      completed: val.completed,
    }));
    const weeklyTrend = monthlyTrend.slice(-7);

    // 5. Parse Focus statistics
    const focusResult = focusStats[0] || { sessionsCompleted: 0, focusMinutesThisWeek: 0, focusMinutesThisMonth: 0 };
    const focusHoursThisWeek = Math.round((focusResult.focusMinutesThisWeek / 60) * 10) / 10;
    const focusHoursThisMonth = Math.round((focusResult.focusMinutesThisMonth / 60) * 10) / 10;

    return {
      completionRate,
      totalTasks,
      completedTasks,
      totalSubtasks,
      completedSubtasks,
      subtaskCompletionRate,
      averageTaskProgress,
      mostProductiveCategory,
      mostCompletedPriority,
      overdueTasks: rawStats.overdueTasks,
      weekly: {
        created: rawStats.weeklyCreated,
        completed: rawStats.weeklyCompleted,
      },
      monthly: {
        created: rawStats.monthlyCreated,
        completed: rawStats.monthlyCompleted,
      },
      statusDistribution,
      priorityDistribution,
      weeklyTrend,
      monthlyTrend,
      focus: {
        hoursThisWeek: focusHoursThisWeek,
        hoursThisMonth: focusHoursThisMonth,
        sessionsCompleted: focusResult.sessionsCompleted,
      },
    };
  }
}

export default new AnalyticsService();
