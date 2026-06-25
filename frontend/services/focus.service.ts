import apiClient from "./axios";
import { ApiResponse } from "./auth.service";
import { Task } from "./task.service";

export interface FocusSession {
  _id: string;
  userId: string;
  taskId: Partial<Task> & { _id: string; title: string };
  duration: number; // in minutes
  startedAt: string;
  completedAt?: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export const focusService = {
  async startSession(taskId: string, duration: number): Promise<ApiResponse<FocusSession>> {
    const response = await apiClient.post<ApiResponse<FocusSession>>("/focus/start", { taskId, duration });
    return response.data;
  },

  async endSession(status: "completed" | "cancelled" = "completed"): Promise<ApiResponse<FocusSession>> {
    const response = await apiClient.post<ApiResponse<FocusSession>>("/focus/end", { status });
    return response.data;
  },

  async getCurrentSession(): Promise<ApiResponse<FocusSession | null>> {
    const response = await apiClient.get<ApiResponse<FocusSession | null>>("/focus/current");
    return response.data;
  },

  async getSessionHistory(): Promise<ApiResponse<FocusSession[]>> {
    const response = await apiClient.get<ApiResponse<FocusSession[]>>("/focus/history");
    return response.data;
  },
};
