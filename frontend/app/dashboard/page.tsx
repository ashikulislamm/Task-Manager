"use client";

import React, { useState, useEffect } from "react";
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
  ChevronRight,
  TrendingUp,
  Calendar,
  AlertCircle,
  Folder,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/shared/Toast";
import { taskService, Task } from "../../services/task.service";
import { analyticsService } from "../../services/analytics.service";
import { activityService } from "../../services/activity.service";
import { focusService } from "../../services/focus.service";
import { useDashboardLayout } from "./layout";
import { Button } from "../../components/shared/Button";
import { Input } from "../../components/shared/Input";
import { Modal } from "../../components/shared/Modal";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { EmptyState } from "../../components/shared/EmptyState";
import { DashboardPageSkeleton } from "../../components/shared/Loader";
import ActivityTimeline from "../../components/shared/ActivityTimeline";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { createModalOpen, setCreateModalOpen } = useDashboardLayout();
  const queryClient = useQueryClient();

  // Local UI States
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState<"all" | "work" | "personal" | "study" | "health">("all");
  const [dashboardTab, setDashboardTab] = useState<"overview" | "analytics">("overview");
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Set greeting and client mount status
  useEffect(() => {
    setIsMounted(true);
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

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

  const isRecurringCreate = watchCreate("isRecurring");
  const isRecurringEdit = watchEdit("isRecurring");

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
  const { data: response, isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await taskService.getTasks();
      return res.data;
    },
  });

  // React Query: Get Productivity Analytics Overview
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await analyticsService.getOverview();
      return res.data;
    },
  });

  // React Query: Get Activities Timeline
  const { data: activityResponse, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ["activities", 1],
    queryFn: async () => {
      const res = await activityService.getActivities({ page: 1, limit: 12 });
      return res.data;
    },
  });

  // React Query: Get Current Active Focus Session
  const { data: activeFocus } = useQuery({
    queryKey: ["currentFocus"],
    queryFn: async () => {
      const res = await focusService.getCurrentSession();
      return res.data;
    },
  });

  const tasks = response || [];
  const activities = activityResponse?.activities || [];

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      success("Task updated successfully!");
      setEditingTask(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      success("Task deleted successfully!");
      setDeletingTaskId(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to delete task");
    },
  });

  // Quick Status Transition
  const handleQuickStatusChange = (task: Task, newStatus: "todo" | "in-progress" | "done") => {
    updateTaskMutation.mutate({
      id: task._id,
      data: { status: newStatus },
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

  // Overdue Check (handles date and time combinations)
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

  // Pending tasks filter
  const dashboardPendingTasks = tasks
    .filter((t) => t.status === "todo" || t.status === "in-progress")
    .filter((t) => dashboardCategoryFilter === "all" || t.category === dashboardCategoryFilter)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Next 5 upcoming deadlines
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== "done")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  if (isTasksLoading || isAnalyticsLoading) {
    return <DashboardPageSkeleton />;
  }

  // Distribution chart data formatting
  const statusData = analytics ? [
    { name: "Todo", value: analytics.statusDistribution.todo },
    { name: "In Progress", value: analytics.statusDistribution.inProgress },
    { name: "Done", value: analytics.statusDistribution.done },
  ] : [];

  const priorityData = analytics ? [
    { name: "Critical", count: analytics.priorityDistribution.critical },
    { name: "High", count: analytics.priorityDistribution.high },
    { name: "Medium", count: analytics.priorityDistribution.medium },
    { name: "Low", count: analytics.priorityDistribution.low },
  ] : [];

  // Theme constants
  const COLORS = ["#e5e5e5", "#666666", "#111111"]; // Grayscale palette

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {greeting}, {user?.name.split(" ")[0]}
          </h2>
          <p className="text-xs text-secondary-text leading-tight mt-0.5">
            Here is your productivity brief for today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/focus">
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-1.5" />
              <span>Pomodoro</span>
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Active Focus Session Widget Banner */}
      {activeFocus && (
        <div className="p-4 border border-neutral-900 bg-neutral-900 text-white rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block leading-none">FOCUS MODE ACTIVE</span>
            <h3 className="text-xs font-bold truncate leading-tight">Currently focusing on: "{activeFocus.taskId.title}"</h3>
            <p className="text-[10px] text-neutral-300 leading-none">Your timer session is still active. Return to prevent cancellation.</p>
          </div>
          <Link href="/dashboard/focus" className="shrink-0">
            <Button variant="outline" size="sm" className="bg-white text-neutral-900 border-none font-bold hover:bg-neutral-100 py-1.5">
              Resume Focus Session
            </Button>
          </Link>
        </div>
      )}

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
        {[
          { label: "Tasks", val: analytics?.totalTasks || 0, icon: CheckSquare, desc: "Aggregate logged tasks" },
          { label: "Completed Tasks", val: analytics?.completedTasks || 0, icon: CheckCircle2, desc: "Total finished tasks" },
          { label: "Subtasks", val: analytics?.totalSubtasks || 0, icon: CheckSquare, desc: "Aggregate subtasks count" },
          { label: "Completed Subtasks", val: analytics?.completedSubtasks || 0, icon: CheckCircle2, desc: "Finished subtasks" },
          { label: "Task Completion Rate", val: `${analytics?.completionRate || 0}%`, icon: TrendingUp, desc: "Completed vs total tasks" },
          { label: "Subtask Completion Rate", val: `${analytics?.subtaskCompletionRate || 0}%`, icon: TrendingUp, desc: "Completed vs total subtasks" },
          { label: "Overdue Tasks", val: analytics?.overdueTasks || 0, icon: AlertCircle, desc: "Overdue pending tasks", warn: (analytics?.overdueTasks || 0) > 0 },
          { label: "Focus Hours", val: `${analytics?.focus.hoursThisWeek || 0}h`, icon: Clock, desc: `${analytics?.focus.sessionsCompleted || 0} sessions completed` },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="p-4 bg-white border border-border-custom rounded-lg shadow-sm flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className={`w-4 h-4 shrink-0 ${card.warn ? "text-neutral-900 font-bold animate-pulse" : "text-secondary-text"}`} />
              </div>
              <div className="mt-2 text-left">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {card.val}
                </span>
                <p className="text-[10px] text-secondary-text mt-1.5 leading-none">
                  {card.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashboard Section Switcher tabs */}
      <div className="flex bg-neutral-100 p-0.5 rounded-lg text-xs font-semibold text-secondary-text w-full sm:w-auto overflow-x-auto select-none border border-border-custom">
        {[
          { id: "overview", label: "Workspace Overview" },
          { id: "analytics", label: "Productivity Insights" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDashboardTab(tab.id as any)}
            className={`
              px-4 py-2 rounded-md transition uppercase leading-none text-[10px] tracking-wider whitespace-nowrap shrink-0 cursor-pointer
              ${dashboardTab === tab.id 
                ? "bg-white border border-border-custom text-foreground shadow-xs font-bold" 
                : "hover:text-foreground hover:bg-hover-custom/50"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents: Overview vs Analytics */}
      <AnimatePresence mode="wait">
        {dashboardTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column: Pending Tasks List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-custom pb-2 gap-2 select-none">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-secondary-text" />
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">
                    Pending Actions ({dashboardPendingTasks.length})
                  </h3>
                </div>
                
                {/* Category Filter Pills */}
                <div className="flex bg-neutral-100 border border-border-custom p-0.5 rounded-md text-lg font-semibold text-secondary-text w-full sm:w-auto overflow-x-auto">
                  {[
                    { id: "all", label: "All" },
                    { id: "work", label: "Work" },
                    { id: "personal", label: "Personal" },
                    { id: "study", label: "Study" },
                    { id: "health", label: "Health" }
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setDashboardCategoryFilter(pill.id as any)}
                      className={`
                        px-3 py-1 rounded transition uppercase leading-none text-[11px] tracking-tight whitespace-nowrap shrink-0 cursor-pointer
                        ${dashboardCategoryFilter === pill.id 
                          ? "bg-white border border-border-custom text-foreground shadow-xs font-bold" 
                          : "hover:text-foreground hover:bg-hover-custom"
                        }
                      `}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task list summary */}
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {dashboardPendingTasks.length > 0 ? (
                    dashboardPendingTasks.map((task) => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <motion.div
                          key={task._id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="p-4 bg-white border border-border-custom rounded-lg shadow-xs hover:border-foreground/45 transition flex items-center justify-between gap-4 group"
                        >
                          <div className="flex items-start gap-3 min-w-0 text-left">
                            <button
                              onClick={() => handleQuickStatusChange(task, "done")}
                              className="text-secondary-text hover:text-foreground shrink-0 mt-0.5 transition cursor-pointer"
                              aria-label="Mark completed"
                            >
                              <Circle className="w-4.5 h-4.5" />
                            </button>
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold tracking-tight text-foreground truncate">
                                  {task.title}
                                </h4>
                                <span className="text-[9px] text-secondary-text font-bold uppercase">
                                  [{task.category}]
                                </span>
                                {task.isRecurring && (
                                  <span className="inline-flex items-center gap-0.5 border border-neutral-350 bg-neutral-100 text-neutral-850 px-1 py-0.5 rounded text-[8px] font-extrabold uppercase">
                                    <span>Repeats {task.recurrenceType}</span>
                                  </span>
                                )}
                                {overdue && (
                                  <span className="inline-flex items-center gap-0.5 border border-neutral-400 bg-neutral-100 text-neutral-900 px-1 py-0.5 rounded text-[8px] font-extrabold uppercase animate-pulse">
                                    <span>Overdue</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-secondary-text leading-normal mt-1 line-clamp-1">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2.5 select-none text-[10px]">
                                <span className="text-[9px] text-secondary-text font-bold uppercase border border-border-custom bg-secondary-bg px-1.5 py-0.5 rounded leading-none shrink-0">
                                  {task.status}
                                </span>
                                {task.dueDate && (
                                  <span className={`text-[10px] font-semibold leading-none shrink-0 ${overdue ? "text-neutral-900 font-bold animate-pulse" : "text-secondary-text"}`}>
                                    Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{task.dueTime ? ` at ${formatDueTime(task.dueTime)}` : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingTask(task)}
                              className="text-secondary-text hover:text-foreground p-1 hover:bg-hover-custom rounded transition cursor-pointer"
                              aria-label="Edit task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingTaskId(task._id)}
                              className="text-secondary-text hover:text-foreground p-1 hover:bg-hover-custom rounded transition cursor-pointer"
                              aria-label="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No pending tasks"
                      description={
                        dashboardCategoryFilter !== "all"
                          ? `No tasks found under category "${dashboardCategoryFilter}".`
                          : "You have no pending tasks. Enjoy your day or create a new one!"
                      }
                      actionText={dashboardCategoryFilter === "all" ? "Create Task" : undefined}
                      onAction={() => setCreateModalOpen(true)}
                    />
                  )}
                </AnimatePresence>
                
                {tasks.length > 0 && (
                  <div className="pt-2 text-center select-none">
                    <Link href="/dashboard/tasks">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary-text hover:text-foreground transition cursor-pointer">
                        <span>Manage all {tasks.length} tasks in Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Task Progress Widget: Top progressing tasks */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4 text-left">
                <div className="flex justify-between items-center border-b border-border-custom pb-2 select-none">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-secondary-text" />
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">
                      Top Progressing Tasks
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-secondary-text uppercase">
                    Sorted by Progress
                  </span>
                </div>
                
                {tasks.filter(t => t.subtasks && t.subtasks.length > 0).length > 0 ? (
                  <div className="space-y-3.5 pt-1">
                    {[...tasks]
                      .filter(t => t.subtasks && t.subtasks.length > 0)
                      .sort((a, b) => (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0))
                      .slice(0, 3)
                      .map((task) => (
                        <div key={task._id} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-foreground truncate max-w-[80%]">{task.title}</span>
                            <span className="font-semibold text-secondary-text">{task.progressPercentage ?? 0}%</span>
                          </div>
                          <div className="w-full bg-neutral-100 border border-border-custom/50 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-neutral-900 h-full rounded-full transition-all duration-300"
                              style={{ width: `${task.progressPercentage ?? 0}%` }}
                            />
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-secondary-text border border-dashed border-border-custom rounded-lg bg-neutral-50 select-none animate-fadeIn">
                    Create tasks with subtasks to track progress.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Deadlines & Activity Timeline */}
            <div className="space-y-6 select-none text-left">
              {/* Overdue Subtasks Widget */}
              {(() => {
                const overdueSubtasks = tasks
                  .filter(t => t.status !== "done" && t.subtasks && t.subtasks.length > 0)
                  .flatMap(t => (t.subtasks || []).map(s => ({ ...s, parentTask: t })))
                  .filter(s => s.dueDate && !s.completed && new Date(s.dueDate) < new Date(new Date().setHours(0,0,0,0)));

                if (overdueSubtasks.length > 0) {
                  return (
                    <div className="p-5 border border-neutral-950 bg-neutral-950 text-white rounded-lg shadow-sm space-y-4">
                      <div className="flex items-center gap-1.5 text-left border-b border-neutral-800 pb-2">
                        <AlertCircle className="w-4 h-4 text-neutral-300 shrink-0" />
                        <h3 className="text-xs font-extrabold tracking-wider text-neutral-300 uppercase leading-none">
                          Overdue Subtasks ({overdueSubtasks.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {overdueSubtasks.map((sub) => (
                          <div key={sub._id} className="text-xs text-left bg-neutral-900 border border-neutral-850 p-2.5 rounded flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-100 truncate">{sub.title}</p>
                              <p className="text-[9px] text-neutral-400 truncate mt-0.5">Parent: {sub.parentTask.title}</p>
                            </div>
                            <span className="text-[9px] font-extrabold text-neutral-300 bg-neutral-850 border border-neutral-800 px-1.5 py-0.5 rounded shrink-0">
                              {new Date(sub.dueDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Upcoming Subtask Deadlines Widget */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-secondary-text" />
                  <span>Upcoming Subtask Deadlines</span>
                </h3>

                {(() => {
                  const subtaskDeadlines = tasks
                    .filter(t => t.status !== "done" && t.subtasks && t.subtasks.length > 0)
                    .flatMap(t => (t.subtasks || []).map(s => ({ ...s, parentTask: t })))
                    .filter(s => s.dueDate && !s.completed)
                    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                    .slice(0, 4);

                  if (subtaskDeadlines.length > 0) {
                    return (
                      <div className="flex flex-col gap-2">
                        {subtaskDeadlines.map((sub) => {
                          const subtaskOverdue = new Date(sub.dueDate!) < new Date(new Date().setHours(0,0,0,0));
                          return (
                            <div key={sub._id} className="p-2.5 border border-border-custom rounded-md bg-secondary-bg space-y-1">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-xs font-semibold text-foreground truncate">{sub.title}</span>
                                {subtaskOverdue && (
                                  <span className="text-[8px] uppercase font-bold shrink-0 px-1 border border-neutral-400 bg-neutral-250 text-neutral-900 leading-none">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div className="flex justify-between text-[9px] text-secondary-text">
                                <span className="truncate max-w-[65%]">Parent: {sub.parentTask.title}</span>
                                <span className="font-semibold">{new Date(sub.dueDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return (
                    <p className="text-xs text-secondary-text text-center py-2">
                      No upcoming subtask deadlines.
                    </p>
                  );
                })()}
              </div>

              {/* Upcoming Deadlines Widget */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-secondary-text" />
                  <span>Upcoming Deadlines</span>
                </h3>

                {upcomingDeadlines.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {upcomingDeadlines.map((task) => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <div key={task._id} className="p-2.5 border border-border-custom rounded-md bg-secondary-bg space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">{task.title}</span>
                            <span className={`text-[9px] uppercase font-bold shrink-0 px-1.5 py-0.5 border rounded ${overdue ? "border-neutral-400 bg-neutral-200 text-neutral-900" : "border-border-custom bg-white text-secondary-text"}`}>
                              {overdue ? "Overdue" : "Pending"}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-secondary-text">
                            <span>{task.category}</span>
                            <span className="font-semibold">{new Date(task.dueDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-secondary-text text-center py-2">
                    No upcoming deadlines.
                  </p>
                )}
              </div>

              {/* Activity Timeline Widget */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-secondary-text" />
                  <span>Recent Activity</span>
                </h3>
                <ActivityTimeline activities={activities} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
              {/* Weekly Performance Widget */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm flex flex-col justify-between text-left min-h-[120px]">
                <div>
                  <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">WEEKLY PROGRESS SUMMARY</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-foreground">{analytics?.weekly.completed || 0}</span>
                    <span className="text-xs text-secondary-text font-medium">completed / {analytics?.weekly.created || 0} created</span>
                  </div>
                </div>
                <p className="text-[10px] text-secondary-text leading-tight mt-3">Tasks compiled during current calendar week.</p>
              </div>

              {/* Monthly Performance Widget */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm flex flex-col justify-between text-left min-h-[120px]">
                <div>
                  <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">MONTHLY PROGRESS SUMMARY</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-foreground">{analytics?.monthly.completed || 0}</span>
                    <span className="text-xs text-secondary-text font-medium">completed / {analytics?.monthly.created || 0} created</span>
                  </div>
                </div>
                <p className="text-[10px] text-secondary-text leading-tight mt-3">Tasks compiled during current calendar month.</p>
              </div>
            </div>

            {/* Progress Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none mt-4">
              {/* Average Task Progress */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm flex flex-col justify-between text-left min-h-[110px]">
                <div>
                  <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">AVERAGE TASK PROGRESS</span>
                  <span className="text-2xl font-extrabold text-foreground mt-2 block">{analytics?.averageTaskProgress || 0}%</span>
                </div>
                <div className="w-full bg-neutral-100 border border-border-custom/50 rounded-full h-1.5 overflow-hidden mt-2">
                  <div 
                    className="bg-neutral-900 h-full rounded-full transition-all duration-300"
                    style={{ width: `${analytics?.averageTaskProgress || 0}%` }}
                  />
                </div>
              </div>

              {/* Most Productive Category */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm flex flex-col justify-between text-left min-h-[110px]">
                <div>
                  <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">MOST PRODUCTIVE CATEGORY</span>
                  <span className="text-xl font-extrabold text-foreground mt-2.5 block uppercase">[{analytics?.mostProductiveCategory || "None"}]</span>
                </div>
                <p className="text-[9px] text-secondary-text leading-none mt-3">Highest task completion count</p>
              </div>

              {/* Most Completed Priority */}
              <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm flex flex-col justify-between text-left min-h-[110px]">
                <div>
                  <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">MOST COMPLETED PRIORITY</span>
                  <span className="text-xl font-extrabold text-foreground mt-2.5 block uppercase">{analytics?.mostCompletedPriority || "None"}</span>
                </div>
                <p className="text-[9px] text-secondary-text leading-none mt-3">Priority level completed most</p>
              </div>
            </div>

            {/* Charts Grid */}
            {isMounted && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
                {/* 7 Days Trend Chart */}
                <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4 text-left">
                  <h4 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2">
                    Weekly Productivity Trend (Last 7 Days)
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics?.weeklyTrend || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#666666" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#666666" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#111111" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#111111" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#666" }} />
                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#666" }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e5e5e5" }} />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                        <Area type="monotone" name="Created Tasks" dataKey="created" stroke="#666666" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" />
                        <Area type="monotone" name="Completed Tasks" dataKey="completed" stroke="#111111" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 30 Days Trend Chart */}
                <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4 text-left">
                  <h4 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2">
                    Monthly Productivity Trend (Last 30 Days)
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics?.monthlyTrend || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCreatedM" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#666666" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#666666" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCompletedM" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#111111" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#111111" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#666" }} />
                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#666" }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e5e5e5" }} />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                        <Area type="monotone" name="Created Tasks" dataKey="created" stroke="#666666" strokeWidth={2} fillOpacity={1} fill="url(#colorCreatedM)" />
                        <Area type="monotone" name="Completed Tasks" dataKey="completed" stroke="#111111" strokeWidth={2} fillOpacity={1} fill="url(#colorCompletedM)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Distribution Pie Chart */}
                <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4 text-left">
                  <h4 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2">
                    Status Distribution
                  </h4>
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} tasks`]} contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e5e5e5" }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Distribution Bar Chart */}
                <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4 text-left">
                  <h4 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2">
                    Priority Distribution
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#666" }} />
                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#666" }} />
                        <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e5e5e5" }} />
                        <Bar dataKey="count" fill="#111111" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          {priorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === "Critical" ? "#111111" : "#666666"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
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

          {/* Recurrence Options inside Dashboard Creation modal */}
          <div className="border-t border-border-custom pt-4 space-y-4">
            <div className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                id="dash-create-isRecurring"
                disabled={createTaskMutation.isPending}
                className="w-4 h-4 rounded border-border-custom text-foreground focus:ring-foreground accent-foreground cursor-pointer"
                {...registerCreate("isRecurring")}
              />
              <label htmlFor="dash-create-isRecurring" className="text-xs font-bold text-foreground cursor-pointer select-none">
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

          {/* Recurrence Options inside Dashboard Edit modal */}
          <div className="border-t border-border-custom pt-4 space-y-4">
            <div className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                id="dash-edit-isRecurring"
                disabled={updateTaskMutation.isPending}
                className="w-4 h-4 rounded border-border-custom text-foreground focus:ring-foreground accent-foreground cursor-pointer"
                {...registerEdit("isRecurring")}
              />
              <label htmlFor="dash-edit-isRecurring" className="text-xs font-bold text-foreground cursor-pointer select-none">
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
