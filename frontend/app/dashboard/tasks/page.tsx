"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  Clock,
  CheckSquare,
  Search,
  ArrowUpDown,
  Calendar,
  Folder,
  AlertCircle,
  X,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/shared/Toast";
import { taskService, Task } from "../../../services/task.service";
import { useDashboardLayout } from "../layout";
import { Button } from "../../../components/shared/Button";
import { Input } from "../../../components/shared/Input";
import { Modal } from "../../../components/shared/Modal";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { EmptyState } from "../../../components/shared/EmptyState";
import { TaskListSkeleton, SubtaskSkeleton } from "../../../components/shared/Loader";

// Task Validation Schemas
const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
  status: z.enum(["todo", "in-progress", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  dueTime: z.string().optional().nullable().or(z.literal("")),
  category: z.enum(["work", "personal", "study", "health"]),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly"]).optional().nullable().or(z.literal("")),
  recurrenceEndDate: z.string().optional().nullable().or(z.literal("")),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function MyTasksPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { createModalOpen, setCreateModalOpen } = useDashboardLayout();
  const queryClient = useQueryClient();

  // Filters, search, and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "in-progress" | "done">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high" | "critical">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "work" | "personal" | "study" | "health">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alpha-asc" | "alpha-desc" | "priority-asc" | "priority-desc" | "due-asc" | "due-desc">("newest");

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [logContent, setLogContent] = useState("");

  // Subtasks Local States
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [editingSubtaskDueDate, setEditingSubtaskDueDate] = useState("");

  // Form Hooks
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    watch: watchCreate,
    formState: { errors: createErrors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      category: "personal",
      dueDate: "",
      dueTime: "",
      isRecurring: false,
      recurrenceType: "daily",
      recurrenceEndDate: "",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  // Load editing task data into edit form fields
  useEffect(() => {
    if (editingTask) {
      setEditValue("title", editingTask.title);
      setEditValue("description", editingTask.description);
      setEditValue("status", editingTask.status);
      setEditValue("priority", editingTask.priority || "medium");
      setEditValue("category", editingTask.category || "personal");
      setEditValue("dueDate", editingTask.dueDate ? editingTask.dueDate.split("T")[0] : "");
      setEditValue("dueTime", editingTask.dueTime || "");
      setEditValue("isRecurring", editingTask.isRecurring || false);
      setEditValue("recurrenceType", editingTask.recurrenceType || "daily");
      setEditValue("recurrenceEndDate", editingTask.recurrenceEndDate ? editingTask.recurrenceEndDate.split("T")[0] : "");
    }
  }, [editingTask, setEditValue]);

  // React Query: Get User Tasks
  const { data: response, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await taskService.getTasks();
      return res.data;
    },
  });

  const tasks = response || [];

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Task created successfully!");
      setCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to create task");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      taskService.updateTask(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Task updated successfully!");
      setEditingTask(null);
      if (selectedTaskDetails?._id === res.data._id) {
        setSelectedTaskDetails(res.data);
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Task deleted successfully!");
      setDeletingTaskId(null);
      setSelectedTaskDetails(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to delete task");
    },
  });

  const addLogMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      taskService.addLog(taskId, content),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Work log added successfully!");
      setSelectedTaskDetails(res.data);
      setLogContent("");
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to add work log");
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: ({ taskId, logId }: { taskId: string; logId: string }) =>
      taskService.deleteLog(taskId, logId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Work log deleted successfully!");
      setSelectedTaskDetails(res.data);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to delete work log");
    },
  });

  // Subtasks mutations
  const addSubtaskMutation = useMutation({
    mutationFn: ({ taskId, title, dueDate }: { taskId: string; title: string; dueDate?: string | null }) =>
      taskService.addSubtask(taskId, { title, dueDate }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Subtask added successfully!");
      if (selectedTaskDetails?._id === res.data._id) {
        setSelectedTaskDetails(res.data);
      }
      setNewSubtaskTitle("");
      setNewSubtaskDueDate("");
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to add subtask");
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      taskService.toggleSubtask(taskId, subtaskId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (selectedTaskDetails?._id === res.data._id) {
        setSelectedTaskDetails(res.data);
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to toggle subtask");
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ taskId, subtaskId, data }: { taskId: string; subtaskId: string; data: Partial<{ title: string; completed: boolean; dueDate?: string | null }> }) =>
      taskService.updateSubtask(taskId, subtaskId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Subtask updated successfully!");
      if (selectedTaskDetails?._id === res.data._id) {
        setSelectedTaskDetails(res.data);
      }
      setEditingSubtaskId(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to update subtask");
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      taskService.deleteSubtask(taskId, subtaskId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      success("Subtask deleted successfully!");
      if (selectedTaskDetails?._id === res.data._id) {
        setSelectedTaskDetails(res.data);
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to delete subtask");
    },
  });

  const isRecurringCreate = watchCreate("isRecurring");
  const isRecurringEdit = watchEdit("isRecurring");

  // Quick Status Transition
  const handleQuickStatusChange = (task: Task, newStatus: "todo" | "in-progress" | "done") => {
    updateTaskMutation.mutate({
      id: task._id,
      data: { status: newStatus },
    });
  };

  const handleQuickSubtaskToggle = (task: Task, subtaskId: string) => {
    toggleSubtaskMutation.mutate({
      taskId: task._id,
      subtaskId,
    });
  };

  const handleCreateTask = (data: TaskFormValues) => {
    const formattedData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      dueTime: data.dueTime || null,
      recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate).toISOString() : null,
    };
    createTaskMutation.mutate(formattedData);
  };

  const handleUpdateTask = (data: TaskFormValues) => {
    if (editingTask) {
      const formattedData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        dueTime: data.dueTime || null,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate).toISOString() : null,
        recurrenceType: data.recurrenceType === "" ? null : data.recurrenceType,
      };
      updateTaskMutation.mutate({
        id: editingTask._id,
        data: formattedData,
      });
    }
  };

  const handleDeleteTask = () => {
    if (deletingTaskId) {
      deleteTaskMutation.mutate(deletingTaskId);
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskDetails && logContent.trim()) {
      addLogMutation.mutate({
        taskId: selectedTaskDetails._id,
        content: logContent.trim(),
      });
    }
  };

  const handleDeleteLog = (logId: string) => {
    if (selectedTaskDetails) {
      deleteLogMutation.mutate({
        taskId: selectedTaskDetails._id,
        logId,
      });
    }
  };

  // Check if a task is overdue (handles date and time combinations)
  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "done") return false;
    const now = new Date();
    const taskDueDate = new Date(task.dueDate);
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        taskDueDate.setHours(hours, minutes, 0, 0);
        return now > taskDueDate;
      }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    taskDueDate.setHours(0, 0, 0, 0);
    return taskDueDate < today;
  };

  // Helper to format 24-hour time to AM/PM format
  const formatDueTime = (timeStr?: string | null) => {
    if (!timeStr) return "";
    const [hoursStr, minutesStr] = timeStr.split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Filter & Search & Sort computation
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    // 1. Search Filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );
    }

    // 2. Status Dropdown Filter
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    // 3. Priority Dropdown Filter
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // 4. Category Dropdown Filter
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // 5. Quick Filter Tab Selection
    if (quickFilter !== "all") {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      if (quickFilter === "completed") {
        result = result.filter((t) => t.status === "done");
      } else if (quickFilter === "overdue") {
        result = result.filter((t) => isTaskOverdue(t));
      } else if (quickFilter === "today") {
        result = result.filter((t) => t.dueDate && t.dueDate.split("T")[0] === todayStr);
      } else if (quickFilter === "upcoming") {
        result = result.filter((t) => t.dueDate && new Date(t.dueDate) > todayEnd && t.status !== "done");
      }
    }

    // 6. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "alpha-asc":
          return a.title.localeCompare(b.title);
        case "alpha-desc":
          return b.title.localeCompare(a.title);
        case "priority-asc": {
          const weights = { low: 1, medium: 2, high: 3, critical: 4 };
          return (weights[a.priority] || 2) - (weights[b.priority] || 2);
        }
        case "priority-desc": {
          const weights = { low: 1, medium: 2, high: 3, critical: 4 };
          return (weights[b.priority] || 2) - (weights[a.priority] || 2);
        }
        case "due-asc": {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case "due-desc": {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [tasks, searchTerm, statusFilter, priorityFilter, categoryFilter, quickFilter, sortBy]);

  // Counts for tabs/widgets
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;
  const dueTodayCount = tasks.filter((t) => {
    const todayStr = new Date().toISOString().split("T")[0];
    return t.dueDate && t.dueDate.split("T")[0] === todayStr;
  }).length;
  const upcomingCount = tasks.filter((t) => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return t.dueDate && new Date(t.dueDate) > todayEnd && t.status !== "done";
  }).length;

  const getPrioritySymbol = (priority: "low" | "medium" | "high" | "critical") => {
    switch (priority) {
      case "low":
        return "○";
      case "medium":
        return "◔";
      case "high":
        return "◑";
      case "critical":
        return "●";
      default:
        return "◔";
    }
  };

  const getPriorityStyle = (priority: "low" | "medium" | "high" | "critical") => {
    switch (priority) {
      case "low":
        return "border-neutral-200 text-neutral-500 bg-neutral-50";
      case "medium":
        return "border-neutral-300 text-neutral-700 bg-neutral-100";
      case "high":
        return "border-neutral-400 text-neutral-900 bg-neutral-200";
      case "critical":
        return "border-neutral-950 text-white bg-neutral-950";
      default:
        return "border-neutral-300 text-neutral-700 bg-neutral-100";
    }
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-5 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-foreground shrink-0" />
            <span>My Tasks Workspace</span>
          </h2>
          <p className="text-xs text-secondary-text leading-tight mt-0.5">
            Manage, filter, and organize all your logged tasks here.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Toolbar: Search, Advanced Filters, and Sorting Controls */}
      <div className="bg-secondary-bg border border-border-custom rounded-lg p-4 space-y-3.5 select-none shadow-xs">
        <div className="flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-text" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                w-full pl-9 pr-4 py-2 text-xs bg-white border border-border-custom rounded-md 
                placeholder-secondary-text text-foreground outline-none transition
                focus:border-foreground focus:ring-1 focus:ring-foreground
              "
            />
          </div>

          {/* Advanced Multi-Filters Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Status Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-secondary-text uppercase">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-border-custom rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-secondary-text uppercase">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="bg-white border border-border-custom rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-foreground"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-secondary-text uppercase">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-white border border-border-custom rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-foreground"
              >
                <option value="all">All Categories</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="study">Study</option>
                <option value="health">Health</option>
              </select>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-secondary-text uppercase">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-border-custom rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-foreground"
              >
                <option value="newest">Newest Created</option>
                <option value="oldest">Oldest Created</option>
                <option value="alpha-asc">Title: A to Z</option>
                <option value="alpha-desc">Title: Z to A</option>
                <option value="priority-desc">Priority: High to Low</option>
                <option value="priority-asc">Priority: Low to High</option>
                <option value="due-asc">Due Date: Earliest</option>
                <option value="due-desc">Due Date: Latest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-border-custom/50">
          <div className="flex bg-neutral-100 border border-border-custom p-0.5 rounded-md text-sm font-semibold text-secondary-text w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all", label: `All Tasks (${totalCount})` },
              { id: "today", label: `Due Today (${dueTodayCount})` },
              { id: "upcoming", label: `Upcoming (${upcomingCount})` },
              { id: "overdue", label: `Overdue (${overdueCount})` },
              { id: "completed", label: `Completed (${completedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setQuickFilter(tab.id as any)}
                className={`
                  px-3 py-1.5 rounded transition uppercase leading-none text-[11px] tracking-tight whitespace-nowrap shrink-0
                  ${quickFilter === tab.id
                    ? "bg-white border border-border-custom text-foreground shadow-xs font-bold"
                    : "hover:text-foreground hover:bg-hover-custom"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-secondary-text font-medium self-end sm:self-auto">
            Showing {processedTasks.length} of {totalCount} tasks
          </div>
        </div>
      </div>

      {/* Tasks List Content */}
      {isLoading ? (
        <div className="bg-white border border-border-custom rounded-lg p-6 shadow-sm">
          <TaskListSkeleton />
        </div>
      ) : processedTasks.length > 0 ? (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {processedTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              return (
                <motion.div
                  key={task._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelectedTaskDetails(task)}
                  className="p-4.5 bg-gradient-to-r from-gray-50 to-white border border-gray-300 rounded-lg shadow-xs hover:border-gray-500 hover:shadow-md transition flex items-center justify-between gap-4 group cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Status checkbox toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid opening details drawer
                        handleQuickStatusChange(task, task.status === "done" ? "todo" : "done");
                      }}
                      className="text-secondary-text hover:text-foreground shrink-0 mt-0.5 transition cursor-pointer"
                      aria-label={task.status === "done" ? "Mark todo" : "Mark completed"}
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="w-5 h-5 text-foreground" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-xs font-bold tracking-tight text-foreground truncate ${task.status === "done" ? "line-through text-secondary-text" : ""}`}>
                          {task.title}
                        </h4>

                        {/* Category Badge */}
                        <span className="text-[10px] text-secondary-text font-bold uppercase tracking-tight">
                          [{task.category || "personal"}]
                        </span>

                        {/* Priority Badge */}
                        <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getPriorityStyle(task.priority || "medium")}`}>
                          <span>{getPrioritySymbol(task.priority || "medium")}</span>
                          <span>{task.priority || "medium"}</span>
                        </span>

                        {/* Recurrence Badge */}
                        {task.isRecurring && (
                          <span className="inline-flex items-center gap-1 border border-border-custom bg-secondary-bg text-secondary-text px-1.5 py-0.5 rounded text-[9px] font-bold uppercase select-none">
                            <span>Repeats {task.recurrenceType}</span>
                          </span>
                        )}

                        {/* Overdue Badge */}
                        {overdue && (
                          <span className="inline-flex items-center gap-0.5 border border-neutral-400 bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Overdue</span>
                          </span>
                        )}
                      </div>

                      <p className={`text-xs text-secondary-text leading-normal mt-1.5 max-w-2xl truncate ${task.status === "done" ? "line-through" : ""}`}>
                        {task.description}
                      </p>

                      {/* Subtask progress display on card */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3 space-y-2.5 select-none" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center text-[10px] font-bold text-secondary-text uppercase">
                            <span>{task.subtasks.filter((s) => s.completed).length} / {task.subtasks.length} Completed</span>
                            <span>{task.progressPercentage ?? 0}%</span>
                          </div>
                          <div className="w-full bg-neutral-100 border border-border-custom/50 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-neutral-900 h-full rounded-full transition-all duration-300"
                              style={{ width: `${task.progressPercentage ?? 0}%` }}
                            />
                          </div>

                          {/* Inline Subtasks checklist */}
                          {toggleSubtaskMutation.isPending && selectedTaskDetails && selectedTaskDetails._id === task._id ? (
                            <SubtaskSkeleton />
                          ) : (
                            <motion.div
                              className="pt-2.5 border-t border-gray-200/30 space-y-1.5 max-h-40 overflow-y-auto"
                              onClick={(e) => e.stopPropagation()}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              {task.subtasks.map((sub) => {
                                const subOverdue = sub.dueDate && !sub.completed && new Date(sub.dueDate) < new Date(new Date().setHours(0,0,0,0));
                                return (
                                  <motion.div
                                    key={sub._id}
                                    className="flex items-center gap-2 text-left"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <button
                                      onClick={() => handleQuickSubtaskToggle(task, sub._id)}
                                      className="text-secondary-text hover:text-foreground shrink-0 transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                      aria-label={sub.completed ? 'Reopen subtask' : 'Complete subtask'}
                                      tabIndex={0}
                                    >
                                      {sub.completed ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <span className={`text-[11px] font-medium truncate flex-1 ${sub.completed ? "line-through text-secondary-text" : "text-foreground"}`}
                                    >
                                      {sub.title}
                                    </span>
                                    {sub.dueDate && (
                                      <span className={`text-[9px] px-1 bg-neutral-50 border rounded leading-none shrink-0 ${subOverdue ? "text-neutral-900 border-neutral-400 font-extrabold animate-pulse" : "text-secondary-text border-gray-300"}`}
                                      >
                                        {new Date(sub.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                      </span>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5 select-none text-[10px]">
                        <span className="text-secondary-text font-semibold uppercase bg-secondary-bg px-2 py-0.5 border border-border-custom rounded whitespace-nowrap">
                          Created {new Date(task.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </span>

                        {task.dueDate && (
                          <>
                            <span className="text-secondary-text font-semibold select-none">•</span>
                            <span className={`font-semibold bg-secondary-bg px-2 py-0.5 border border-border-custom rounded whitespace-nowrap flex items-center gap-1 ${overdue ? "text-neutral-900 border-neutral-400 font-extrabold animate-pulse" : "text-secondary-text"}`}>
                              <Calendar className="w-3 h-3 text-secondary-text" />
                              <span>Due: {formatDueDate(task.dueDate)}{task.dueTime ? ` at ${formatDueTime(task.dueTime)}` : ""}</span>
                            </span>
                          </>
                        )}

                        {task.logs && task.logs.length > 0 && (
                          <>
                            <span className="text-secondary-text font-semibold select-none">•</span>
                            <span className="text-secondary-text font-semibold bg-secondary-bg px-2 py-0.5 border border-border-custom rounded whitespace-nowrap flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-secondary-text" />
                              <span>{task.logs.length} Log{task.logs.length > 1 ? "s" : ""}</span>
                            </span>
                          </>
                        )}

                        <span className="text-secondary-text font-semibold select-none">•</span>

                        {/* inline status selector */}
                        <div className="flex items-center gap-1 whitespace-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="text-secondary-text font-medium focus:outline-none focus:ring-2 focus:ring-gray-400">Status:</span>
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleQuickStatusChange(task, e.target.value as any)
                            }
                            className="
                              text-[10px] text-secondary-text font-bold bg-transparent outline-none cursor-pointer uppercase py-0 border-none 
                              hover:text-foreground transition focus:ring-0 select-none
                            "
                          >
                            <option value="todo">Todo</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                      }}
                      className="text-secondary-text hover:text-foreground p-1 hover:bg-hover-custom rounded transition cursor-pointer"
                      aria-label="Edit task"
                    >
                      <Edit2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTaskId(task._id);
                      }}
                      className="text-secondary-text hover:text-foreground p-1 hover:bg-hover-custom rounded transition cursor-pointer"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          title="No tasks found"
          description={
            searchTerm.trim() !== ""
              ? `No tasks match search term "${searchTerm}". Try query edits.`
              : quickFilter !== "all"
                ? `You have no tasks matching quick filter "${quickFilter}".`
                : "You haven't logged any tasks yet. Create one to get started!"
          }
          actionText={quickFilter === "all" || searchTerm.trim() !== "" ? "Create Task" : undefined}
          onAction={() => setCreateModalOpen(true)}
        />
      )}

      {/* TASK DETAILS SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {selectedTaskDetails && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskDetails(null)}
              className="fixed inset-0 bg-black pointer-events-auto"
            />

            {/* Slide-over Drawer panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-white border-l border-border-custom shadow-2xl flex flex-col z-10 pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border-custom bg-white">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">
                    {selectedTaskDetails.title}
                  </h3>
                  <p className="text-[10px] text-secondary-text uppercase font-semibold mt-0.5 tracking-wide">
                    Task Workspace
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTaskDetails(null)}
                  className="text-secondary-text hover:text-foreground transition p-1 rounded-md hover:bg-hover-custom"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                {/* Meta details list */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 border border-border-custom rounded-lg p-3 bg-secondary-bg">
                    <div>
                      <span className="text-[9px] font-bold text-secondary-text uppercase block">Status</span>
                      <select
                        value={selectedTaskDetails.status}
                        onChange={(e) => handleQuickStatusChange(selectedTaskDetails, e.target.value as any)}
                        className="text-xs text-foreground font-bold bg-transparent outline-none uppercase py-0.5 cursor-pointer mt-0.5 border-none"
                      >
                        <option value="todo">Todo</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-secondary-text uppercase block">Priority</span>
                      <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${getPriorityStyle(selectedTaskDetails.priority || "medium")}`}>
                        <span>{getPrioritySymbol(selectedTaskDetails.priority || "medium")}</span>
                        <span>{selectedTaskDetails.priority || "medium"}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-secondary-text uppercase block">Category</span>
                      <span className="inline-block text-xs font-bold text-foreground mt-1.5 uppercase">
                        [{selectedTaskDetails.category || "personal"}]
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-secondary-text uppercase block">Due Date</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5 text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-secondary-text" />
                        <span>
                          {selectedTaskDetails.dueDate
                            ? `${formatDueDate(selectedTaskDetails.dueDate)}${selectedTaskDetails.dueTime ? ` at ${formatDueTime(selectedTaskDetails.dueTime)}` : ""}`
                            : "None"}
                        </span>
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-border-custom/50 pt-2.5 mt-1 select-none">
                      <span className="text-[9px] font-bold text-secondary-text uppercase block">Focus Mode</span>
                      <Link href={`/dashboard/focus?taskId=${selectedTaskDetails._id}`} className="inline-block">
                        <span className="inline-flex items-center gap-1 text-xs font-bold mt-1 text-foreground hover:underline">
                          <Clock className="w-3.5 h-3.5 text-secondary-text animate-pulse" />
                          <span>Start Focus Session</span>
                        </span>
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-secondary-text uppercase">Description</span>
                    <p className="text-xs text-foreground leading-relaxed bg-neutral-50 border border-border-custom p-3 rounded-md whitespace-pre-wrap">
                      {selectedTaskDetails.description}
                    </p>
                  </div>
                </div>

                <hr className="border-border-custom" />

                {/* Subtasks Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center select-none text-left">
                    <div>
                      <h4 className="text-xs font-bold text-foreground tracking-tight uppercase flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-secondary-text" />
                        <span>Subtasks</span>
                      </h4>
                      <p className="text-[10px] text-secondary-text leading-tight mt-0.5">
                        Break down work into smaller steps
                      </p>
                    </div>
                    {selectedTaskDetails.subtasks && selectedTaskDetails.subtasks.length > 0 && (
                      <span className="text-[10px] font-bold text-secondary-text px-2 py-0.5 border border-border-custom bg-secondary-bg rounded-md uppercase">
                        {selectedTaskDetails.subtasks.filter(s => s.completed).length} / {selectedTaskDetails.subtasks.length} Completed
                      </span>
                    )}
                  </div>

                  {/* Drawer Progress Bar */}
                  {selectedTaskDetails.subtasks && selectedTaskDetails.subtasks.length > 0 && (
                    <div className="space-y-1 select-none">
                      <div className="w-full bg-neutral-100 border border-border-custom/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-neutral-900 h-full rounded-full transition-all duration-300"
                          style={{ width: `${selectedTaskDetails.progressPercentage ?? 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Subtask list */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedTaskDetails.subtasks && selectedTaskDetails.subtasks.length > 0 ? (
                      selectedTaskDetails.subtasks.map((subtask) => {
                        const isOverdue = subtask.dueDate && !subtask.completed && new Date(subtask.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                        const isEditing = editingSubtaskId === subtask._id;
                        
                        return (
                          <div 
                            key={subtask._id} 
                            className="p-2.5 bg-secondary-bg border border-border-custom rounded-md flex items-center justify-between gap-3 group/subtask transition hover:border-neutral-300 text-left"
                          >
                            {isEditing ? (
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (editingSubtaskTitle.trim()) {
                                    updateSubtaskMutation.mutate({
                                      taskId: selectedTaskDetails._id,
                                      subtaskId: subtask._id,
                                      data: {
                                        title: editingSubtaskTitle.trim(),
                                        dueDate: editingSubtaskDueDate ? new Date(editingSubtaskDueDate).toISOString() : null,
                                      }
                                    });
                                  }
                                }}
                                className="flex-1 flex flex-col gap-2"
                              >
                                <input
                                  type="text"
                                  value={editingSubtaskTitle}
                                  onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 border border-border-custom bg-white rounded outline-none focus:border-foreground"
                                  placeholder="Subtask Title"
                                  autoFocus
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="date"
                                    value={editingSubtaskDueDate}
                                    onChange={(e) => setEditingSubtaskDueDate(e.target.value)}
                                    className="text-[10px] px-2 py-1 border border-border-custom bg-white rounded outline-none focus:border-foreground"
                                  />
                                  <div className="flex gap-1.5">
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => setEditingSubtaskId(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      type="submit" 
                                      variant="primary" 
                                      size="sm" 
                                      disabled={!editingSubtaskTitle.trim() || updateSubtaskMutation.isPending}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubtaskMutation.mutate({
                                        taskId: selectedTaskDetails._id,
                                        subtaskId: subtask._id,
                                      });
                                    }}
                                    className="text-secondary-text hover:text-foreground shrink-0 mt-0.5 transition cursor-pointer"
                                  >
                                    {subtask.completed ? (
                                      <CheckCircle2 className="w-4 h-4 text-foreground" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-semibold text-foreground truncate ${subtask.completed ? "line-through text-secondary-text" : ""}`}>
                                      {subtask.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1 select-none text-[9px]">
                                      {subtask.dueDate && (
                                        <span className={`flex items-center gap-0.5 border px-1.5 py-0.5 rounded font-medium bg-white text-secondary-text ${isOverdue ? "text-neutral-900 border-neutral-400 font-bold" : "border-border-custom"}`}>
                                          <Calendar className="w-2.5 h-2.5" />
                                          <span>Due {new Date(subtask.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                        </span>
                                      )}
                                      {isOverdue && (
                                        <span className="border border-neutral-400 bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded font-extrabold uppercase select-none animate-pulse">
                                          Overdue
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-1.5 shrink-0 opacity-0 group-hover/subtask:opacity-100 transition-opacity">
                                  <Link href={`/dashboard/focus?taskId=${selectedTaskDetails._id}&subtaskId=${subtask._id}`} className="text-secondary-text hover:text-foreground p-0.5 hover:bg-hover-custom rounded transition cursor-pointer" title="Start Focus Mode on Subtask">
                                    <Clock className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => {
                                      setEditingSubtaskId(subtask._id);
                                      setEditingSubtaskTitle(subtask.title);
                                      setEditingSubtaskDueDate(subtask.dueDate ? subtask.dueDate.split("T")[0] : "");
                                    }}
                                    className="text-secondary-text hover:text-foreground p-0.5 hover:bg-hover-custom rounded transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      deleteSubtaskMutation.mutate({
                                        taskId: selectedTaskDetails._id,
                                        subtaskId: subtask._id,
                                      });
                                    }}
                                    className="text-secondary-text hover:text-foreground p-0.5 hover:bg-hover-custom rounded transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 border border-dashed border-border-custom rounded-md text-xs text-secondary-text select-none">
                        No subtasks added yet.
                      </div>
                    )}
                  </div>

                  {/* Add subtask Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newSubtaskTitle.trim()) {
                        addSubtaskMutation.mutate({
                          taskId: selectedTaskDetails._id,
                          title: newSubtaskTitle.trim(),
                          dueDate: newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : null,
                        });
                      }
                    }}
                    className="space-y-2 pt-2 border-t border-border-custom"
                  >
                    <input
                      type="text"
                      placeholder="Add subtask title..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      disabled={addSubtaskMutation.isPending}
                      className="w-full text-xs px-2.5 py-2 bg-white border border-border-custom rounded-md placeholder-secondary-text text-foreground outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                    />
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[9px] font-bold text-secondary-text uppercase select-none">Deadline:</label>
                        <input
                          type="date"
                          value={newSubtaskDueDate}
                          onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                          disabled={addSubtaskMutation.isPending}
                          className="text-[11px] px-2 py-1 bg-white border border-border-custom rounded-md text-foreground outline-none cursor-pointer focus:border-foreground"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={addSubtaskMutation.isPending}
                        disabled={!newSubtaskTitle.trim() || addSubtaskMutation.isPending}
                      >
                        Add Subtask
                      </Button>
                    </div>
                  </form>
                </div>

                <hr className="border-border-custom" />

                {/* Work Log section */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground tracking-tight uppercase flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-secondary-text" />
                      <span>Work Logs & Notes</span>
                    </h4>
                    <p className="text-[10px] text-secondary-text">Keep progress updates and work notes inside this task</p>
                  </div>

                  {/* Add log form */}
                  <form onSubmit={handleAddLog} className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Write progress update or log note..."
                      value={logContent}
                      onChange={(e) => setLogContent(e.target.value)}
                      disabled={addLogMutation.isPending}
                      className="w-full text-xs p-2.5 bg-white border border-border-custom rounded-md placeholder-secondary-text text-foreground outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={addLogMutation.isPending}
                        disabled={!logContent.trim() || addLogMutation.isPending}
                      >
                        Add Update
                      </Button>
                    </div>
                  </form>

                  {/* Work logs list */}
                  <div className="space-y-2">
                    {selectedTaskDetails.logs && selectedTaskDetails.logs.length > 0 ? (
                      <div className="flex flex-col gap-2 pt-1">
                        {[...selectedTaskDetails.logs].reverse().map((log) => (
                          <div key={log._id} className="p-3 bg-secondary-bg border border-border-custom rounded-md relative group/log flex justify-between items-start gap-4">
                            <div className="space-y-1 flex-1">
                              <p className="text-xs text-foreground leading-normal whitespace-pre-wrap select-text font-medium">
                                {log.content}
                              </p>
                              <span className="text-[10px] text-secondary-text font-semibold block leading-none pt-0.5">
                                {getRelativeTime(log.createdAt)} • {new Date(log.createdAt).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDeleteLog(log._id)}
                              disabled={deleteLogMutation.isPending}
                              className="text-secondary-text hover:text-foreground p-0.5 hover:bg-hover-custom rounded transition shrink-0 opacity-0 group-hover/log:opacity-100 disabled:opacity-50 cursor-pointer"
                              aria-label="Delete log entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-border-custom rounded-md text-xs text-secondary-text select-none">
                        No progress updates logged.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Task"
        size="md"
      >
        <form onSubmit={handleCreateSubmit(handleCreateTask)} className="space-y-4 text-left">
          <Input
            label="Task Title"
            placeholder="e.g. Set up deployment pipeline"
            error={createErrors.title?.message}
            disabled={createTaskMutation.isPending}
            {...registerCreate("title")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground tracking-tight select-none">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide context or instructions for this task..."
              disabled={createTaskMutation.isPending}
              className={`
                w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                placeholder-secondary-text text-foreground outline-none transition
                focus:border-foreground focus:ring-1 focus:ring-foreground
                disabled:bg-secondary-bg disabled:text-secondary-text disabled:cursor-not-allowed
                ${createErrors.description?.message ? "border-foreground ring-1 ring-foreground" : ""}
              `}
              {...registerCreate("description")}
            />
            {createErrors.description?.message && (
              <span className="text-xs text-foreground font-medium mt-0.5 block">
                {createErrors.description.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5 select-none">
              <label className="text-xs font-semibold text-foreground tracking-tight">
                Category
              </label>
              <select
                disabled={createTaskMutation.isPending}
                className="
                  w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                  text-foreground outline-none cursor-pointer transition uppercase font-semibold
                  focus:border-foreground focus:ring-1 focus:ring-foreground
                "
                {...registerCreate("category")}
              >
                <option value="personal">Personal</option>
                <option value="work">Work</option>
                <option value="study">Study</option>
                <option value="health">Health</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 select-none">
              <label className="text-xs font-semibold text-foreground tracking-tight">
                Priority
              </label>
              <select
                disabled={createTaskMutation.isPending}
                className="
                  w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                  text-foreground outline-none cursor-pointer transition uppercase font-semibold
                  focus:border-foreground focus:ring-1 focus:ring-foreground
                "
                {...registerCreate("priority")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 select-none">
                <label className="text-xs font-semibold text-foreground tracking-tight">
                  Due Date
                </label>
                <input
                  type="date"
                  disabled={createTaskMutation.isPending}
                  className="
                    w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                    text-foreground outline-none cursor-pointer transition
                    focus:border-foreground focus:ring-1 focus:ring-foreground
                  "
                  {...registerCreate("dueDate")}
                />
              </div>

              <div className="flex flex-col gap-1.5 select-none">
                <label className="text-xs font-semibold text-foreground tracking-tight">
                  Due Time
                </label>
                <input
                  type="time"
                  disabled={createTaskMutation.isPending}
                  className="
                    w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                    text-foreground outline-none cursor-pointer transition
                    focus:border-foreground focus:ring-1 focus:ring-foreground
                  "
                  {...registerCreate("dueTime")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 select-none">
              <label className="text-xs font-semibold text-foreground tracking-tight">
                Initial Status
              </label>
              <select
                disabled={createTaskMutation.isPending}
                className="
                  w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                  text-foreground outline-none cursor-pointer transition uppercase font-semibold
                  focus:border-foreground focus:ring-1 focus:ring-foreground
                "
                {...registerCreate("status")}
              >
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Recurrence Toggle and configuration */}
          <div className="border-t border-border-custom pt-4 space-y-4">
            <div className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                id="create-isRecurring"
                disabled={createTaskMutation.isPending}
                className="w-4 h-4 rounded border-border-custom text-foreground focus:ring-foreground accent-foreground cursor-pointer"
                {...registerCreate("isRecurring")}
              />
              <label htmlFor="create-isRecurring" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Recurring Task (Repeats automatically upon completion)
              </label>
            </div>

            {isRecurringCreate && (
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="flex flex-col gap-1.5 select-none">
                  <label className="text-xs font-semibold text-foreground tracking-tight">
                    Recurrence Interval
                  </label>
                  <select
                    disabled={createTaskMutation.isPending}
                    className="
                      w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                      text-foreground outline-none cursor-pointer transition uppercase font-semibold
                      focus:border-foreground focus:ring-1 focus:ring-foreground
                    "
                    {...registerCreate("recurrenceType")}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 select-none">
                  <label className="text-xs font-semibold text-foreground tracking-tight">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    disabled={createTaskMutation.isPending}
                    className="
                      w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                      text-foreground outline-none cursor-pointer transition
                      focus:border-foreground focus:ring-1 focus:ring-foreground
                    "
                    {...registerCreate("recurrenceEndDate")}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 select-none">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              type="button"
              disabled={createTaskMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={createTaskMutation.isPending}
            >
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TASK MODAL */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task Details"
        size="md"
      >
        <form onSubmit={handleEditSubmit(handleUpdateTask)} className="space-y-4 text-left">
          <Input
            label="Task Title"
            placeholder="e.g. Set up deployment pipeline"
            error={editErrors.title?.message}
            disabled={updateTaskMutation.isPending}
            {...registerEdit("title")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground tracking-tight select-none">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide context or instructions for this task..."
              disabled={updateTaskMutation.isPending}
              className={`
                w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                placeholder-secondary-text text-foreground outline-none transition
                focus:border-foreground focus:ring-1 focus:ring-foreground
                disabled:bg-secondary-bg disabled:text-secondary-text disabled:cursor-not-allowed
                ${editErrors.description?.message ? "border-foreground ring-1 ring-foreground" : ""}
              `}
              {...registerEdit("description")}
            />
            {editErrors.description?.message && (
              <span className="text-xs text-foreground font-medium mt-0.5 block">
                {editErrors.description.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5 select-none">
              <label className="text-xs font-semibold text-foreground tracking-tight">
                Category
              </label>
              <select
                disabled={updateTaskMutation.isPending}
                className="
                  w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                  text-foreground outline-none cursor-pointer transition uppercase font-semibold
                  focus:border-foreground focus:ring-1 focus:ring-foreground
                "
                {...registerEdit("category")}
              >
                <option value="personal">Personal</option>
                <option value="work">Work</option>
                <option value="study">Study</option>
                <option value="health">Health</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 select-none">
              <label className="text-xs font-semibold text-foreground tracking-tight">
                Priority
              </label>
              <select
                disabled={updateTaskMutation.isPending}
                className="
                  w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                  text-foreground outline-none cursor-pointer transition uppercase font-semibold
                  focus:border-foreground focus:ring-1 focus:ring-foreground
                "
                {...registerEdit("priority")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 select-none">
                <label className="text-xs font-semibold text-foreground tracking-tight">
                  Due Date
                </label>
                <input
                  type="date"
                  disabled={updateTaskMutation.isPending}
                  className="
                    w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                    text-foreground outline-none cursor-pointer transition
                    focus:border-foreground focus:ring-1 focus:ring-foreground
                  "
                  {...registerEdit("dueDate")}
                />
              </div>

              <div className="flex flex-col gap-1.5 select-none">
                <label className="text-xs font-semibold text-foreground tracking-tight">
                  Due Time
                </label>
                <input
                  type="time"
                  disabled={updateTaskMutation.isPending}
                  className="
                    w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                    text-foreground outline-none cursor-pointer transition
                    focus:border-foreground focus:ring-1 focus:ring-foreground
                  "
                  {...registerEdit("dueTime")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 select-none">
              <label className="text-xs font-semibold text-foreground tracking-tight">
                Status
              </label>
              <select
                disabled={updateTaskMutation.isPending}
                className="
                  w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                  text-foreground outline-none cursor-pointer transition uppercase font-semibold
                  focus:border-foreground focus:ring-1 focus:ring-foreground
                "
                {...registerEdit("status")}
              >
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Recurrence Toggle and configuration */}
          <div className="border-t border-border-custom pt-4 space-y-4">
            <div className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                id="edit-isRecurring"
                disabled={updateTaskMutation.isPending}
                className="w-4 h-4 rounded border-border-custom text-foreground focus:ring-foreground accent-foreground cursor-pointer"
                {...registerEdit("isRecurring")}
              />
              <label htmlFor="edit-isRecurring" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Recurring Task (Repeats automatically upon completion)
              </label>
            </div>

            {isRecurringEdit && (
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="flex flex-col gap-1.5 select-none">
                  <label className="text-xs font-semibold text-foreground tracking-tight">
                    Recurrence Interval
                  </label>
                  <select
                    disabled={updateTaskMutation.isPending}
                    className="
                      w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                      text-foreground outline-none cursor-pointer transition uppercase font-semibold
                      focus:border-foreground focus:ring-1 focus:ring-foreground
                    "
                    {...registerEdit("recurrenceType")}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 select-none">
                  <label className="text-xs font-semibold text-foreground tracking-tight">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    disabled={updateTaskMutation.isPending}
                    className="
                      w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-md 
                      text-foreground outline-none cursor-pointer transition
                      focus:border-foreground focus:ring-1 focus:ring-foreground
                    "
                    {...registerEdit("recurrenceEndDate")}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 select-none">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTask(null)}
              type="button"
              disabled={updateTaskMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={updateTaskMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action is permanent and cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
}
