import apiClient from "./axios";
import { ApiResponse } from "./auth.service";

export interface AnalyticsOverview {
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  weekly: {
    created: number;
    completed: number;
  };
  monthly: {
    created: number;
    completed: number;
  };
  statusDistribution: {
    todo: number;
    inProgress: number;
    done: number;
  };
  priorityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  weeklyTrend: { date: string; created: number; completed: number }[];
  monthlyTrend: { date: string; created: number; completed: number }[];
  focus: {
    hoursThisWeek: number;
    hoursThisMonth: number;
    sessionsCompleted: number;
  };
}

export const analyticsService = {
  async getOverview(): Promise<ApiResponse<AnalyticsOverview>> {
    const response = await apiClient.get<ApiResponse<AnalyticsOverview>>("/analytics/overview");
    return response.data;
  },
};
