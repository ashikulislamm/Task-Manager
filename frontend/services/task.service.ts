import apiClient from "./axios";
import { ApiResponse } from "./auth.service";

export interface Subtask {
  _id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: string | null;
  dueTime?: string | null;
  category: "work" | "personal" | "study" | "health";
  logs?: { _id: string; content: string; createdAt: string }[];
  subtasks?: Subtask[];
  progressPercentage?: number;
  userId: string;
  isRecurring?: boolean;
  recurrenceType?: "daily" | "weekly" | "monthly" | null;
  recurrenceEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const taskService = {
  /**
   * Fetch all tasks created by the logged-in user
   */
  async getTasks(params?: Record<string, any>): Promise<ApiResponse<Task[]>> {
    const response = await apiClient.get<ApiResponse<Task[]>>("/tasks", { params });
    return response.data;
  },

  /**
   * Fetch details of a single task
   */
  async getTask(id: string): Promise<ApiResponse<Task>> {
    const response = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  async createTask(data: {
    title: string;
    description: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    dueTime?: string | null;
    category?: string;
    isRecurring?: boolean;
    recurrenceType?: string | null;
    recurrenceEndDate?: string | null;
  }): Promise<ApiResponse<Task>> {
    const response = await apiClient.post<ApiResponse<Task>>("/tasks", data);
    return response.data;
  },

  /**
   * Update task details (title, description, status, priority, dueDate, category)
   */
  async updateTask(id: string, data: Partial<Omit<Task, "_id" | "userId" | "createdAt" | "updatedAt" | "logs">>): Promise<ApiResponse<Task>> {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${id}`, data);
    return response.data;
  },

  /**
   * Delete task
   */
  async deleteTask(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/tasks/${id}`);
    return response.data;
  },

  /**
   * Add a work log update to a task
   */
  async addLog(taskId: string, content: string): Promise<ApiResponse<Task>> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${taskId}/logs`, { content });
    return response.data;
  },

  /**
   * Delete a work log from a task
   */
  async deleteLog(taskId: string, logId: string): Promise<ApiResponse<Task>> {
    const response = await apiClient.delete<ApiResponse<Task>>(`/tasks/${taskId}/logs/${logId}`);
    return response.data;
  },

  /**
   * Add subtask
   */
  async addSubtask(taskId: string, data: { title: string; dueDate?: string | null }): Promise<ApiResponse<Task>> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${taskId}/subtasks`, data);
    return response.data;
  },

  /**
   * Update subtask
   */
  async updateSubtask(taskId: string, subtaskId: string, data: Partial<{ title: string; completed: boolean; dueDate?: string | null }>): Promise<ApiResponse<Task>> {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/subtasks/${subtaskId}`, data);
    return response.data;
  },

  /**
   * Delete subtask
   */
  async deleteSubtask(taskId: string, subtaskId: string): Promise<ApiResponse<Task>> {
    const response = await apiClient.delete<ApiResponse<Task>>(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return response.data;
  },

  /**
   * Toggle completion status of a subtask
   */
  async toggleSubtask(taskId: string, subtaskId: string): Promise<ApiResponse<Task>> {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
    return response.data;
  },
};
