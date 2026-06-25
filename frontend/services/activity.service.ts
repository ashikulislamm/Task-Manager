import apiClient from "./axios";
import { ApiResponse } from "./auth.service";

export interface Activity {
  _id: string;
  userId: string;
  taskId?: { _id: string; title: string } | null;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface PaginatedActivities {
  activities: Activity[];
  totalPages: number;
  currentPage: number;
  totalActivities: number;
}

export const activityService = {
  async getActivities(params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedActivities>> {
    const response = await apiClient.get<ApiResponse<PaginatedActivities>>("/activities", { params });
    return response.data;
  },
};
