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
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/shared/Toast";
import { taskService, Task } from "../../services/task.service";
import { useDashboardLayout } from "./layout";
import { Button } from "../../components/shared/Button";
import { Input } from "../../components/shared/Input";
import { Modal } from "../../components/shared/Modal";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { EmptyState } from "../../components/shared/EmptyState";
import { DashboardPageSkeleton } from "../../components/shared/Loader";

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
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function DashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { createModalOpen, setCreateModalOpen } = useDashboardLayout();
  const queryClient = useQueryClient();

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");

  // Determine welcome greeting based on local time
  useEffect(() => {
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
    formState: { errors: createErrors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
    createTaskMutation.mutate(data);
  };

  const handleUpdateTask = (data: TaskFormValues) => {
    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask._id,
        data,
      });
    }
  };

  const handleDeleteTask = () => {
    if (deletingTaskId) {
      deleteTaskMutation.mutate(deletingTaskId);
    }
  };

  // Stat computations
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Filter tasks to show only pending ones (todo or in-progress) on dashboard summary
  // Sorted by updatedAt descending and capped at top 5
  const dashboardPendingTasks = tasks
    .filter((t) => t.status === "todo" || t.status === "in-progress")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Recent Activity logic
  const getRecentActivities = () => {
    if (tasks.length === 0) return [];
    
    const sorted = [...tasks].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return sorted.slice(0, 4).map((task) => {
      const isNew = task.createdAt === task.updatedAt;
      const dateStr = new Date(task.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      return {
        id: task._id,
        title: task.title,
        status: task.status,
        date: dateStr,
        description: isNew 
          ? `Created task: "${task.title}"` 
          : `Moved task "${task.title}" to status "${task.status}"`
      };
    });
  };

  const recentActivities = getRecentActivities();

  if (isLoading) {
    return <DashboardPageSkeleton />;
  }

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
        <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        {[
          { label: "Total Tasks", val: totalCount, icon: CheckSquare, desc: "Aggregate tasks logged" },
          { label: "To Do", val: todoCount, icon: Circle, desc: "Awaiting execution" },
          { label: "In Progress", val: inProgressCount, icon: Clock, desc: "Tasks actively running" },
          { label: "Completed", val: doneCount, icon: CheckCircle2, desc: "Successfully completed" },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="p-5 bg-white border border-border-custom rounded-lg shadow-sm flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary-text uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className="w-4 h-4 text-secondary-text shrink-0" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {card.val}
                </span>
                <p className="text-xs text-secondary-text mt-1 leading-none">
                  {card.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Summary List vs Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Pending Tasks Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border-custom pb-2 select-none">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-secondary-text" />
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Pending Actions ({dashboardPendingTasks.length})
              </h3>
            </div>
            
            <Link href="/dashboard/tasks">
              <span className="text-xs font-bold text-secondary-text hover:text-foreground transition flex items-center gap-1 cursor-pointer">
                <span>View Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>

          {/* Task list summary */}
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {dashboardPendingTasks.length > 0 ? (
                dashboardPendingTasks.map((task) => (
                  <motion.div
                    key={task._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 bg-white border border-border-custom rounded-lg shadow-xs hover:border-foreground/45 transition flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Checkbox for quick completion */}
                      <button
                        onClick={() => 
                          handleQuickStatusChange(task, "done")
                        }
                        className="text-secondary-text hover:text-foreground shrink-0 mt-0.5 transition cursor-pointer"
                        aria-label="Mark completed"
                      >
                        <Circle className="w-4.5 h-4.5" />
                      </button>
                      
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold tracking-tight text-foreground truncate">
                          {task.title}
                        </h4>
                        <p className="text-xs text-secondary-text leading-normal mt-1 line-clamp-1">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2 select-none">
                          <span className="text-[10px] text-secondary-text font-bold uppercase border border-border-custom bg-secondary-bg px-1.5 py-0.5 rounded leading-none shrink-0">
                            {task.status}
                          </span>
                          <span className="text-xs text-secondary-text font-medium">
                            Updated {new Date(task.updatedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions panel */}
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
                ))
              ) : (
                <EmptyState
                  title="All caught up!"
                  description="You have no pending tasks. Enjoy your day or create a new one!"
                  actionText="Create Task"
                  onAction={() => setCreateModalOpen(true)}
                />
              )}
            </AnimatePresence>
            
            {dashboardPendingTasks.length > 0 && (
              <div className="pt-2 text-center select-none">
                <Link href="/dashboard/tasks">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary-text hover:text-foreground transition cursor-pointer">
                    <span>Manage all {totalCount} tasks in Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Productivity Widgets */}
        <div className="space-y-6 select-none">
          
          {/* Widget 1: Completion rate progress */}
          <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground tracking-tight uppercase">
                Productivity
              </h3>
              <TrendingUp className="w-4 h-4 text-secondary-text shrink-0" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end text-xs">
                <span className="text-secondary-text font-medium">Completion rate</span>
                <span className="text-foreground font-bold">{completionRate}%</span>
              </div>
              <div className="w-full h-2 bg-secondary-bg border border-border-custom rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-foreground rounded-full"
                />
              </div>
              <p className="text-xs text-secondary-text leading-normal pt-1.5">
                Completed {doneCount} of {totalCount} total logged tasks. Keep it up!
              </p>
            </div>
          </div>

          {/* Widget 2: Recent Activity logs */}
          <div className="p-5 border border-border-custom rounded-lg bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground tracking-tight uppercase border-b border-border-custom pb-2">
              Recent Activity
            </h3>
            
            {recentActivities.length > 0 ? (
              <div className="relative border-l border-border-custom ml-1.5 pl-3.5 space-y-4 text-left">
                {recentActivities.map((act) => (
                  <div key={act.id} className="relative text-xs leading-normal">
                    {/* Ring timeline marker */}
                    <div className="absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full bg-white border border-foreground" />
                    
                    <span className="text-foreground font-semibold line-clamp-2">
                      {act.description}
                    </span>
                    <span className="text-xs text-secondary-text font-medium block mt-1 leading-none">
                      {act.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-secondary-text text-center py-4">
                No recent activity recorded.
              </p>
            )}
          </div>
        </div>
      </div>

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
