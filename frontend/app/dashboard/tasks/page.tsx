"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ArrowUpDown
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
import { TaskListSkeleton } from "../../../components/shared/Loader";

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

export default function MyTasksPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { createModalOpen, setCreateModalOpen } = useDashboardLayout();
  const queryClient = useQueryClient();

  // Filters, search, and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "todo" | "in-progress" | "done" | "pending">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alpha-asc" | "alpha-desc">("newest");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

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

    // 2. Status Filter
    if (activeFilter !== "all") {
      if (activeFilter === "pending") {
        result = result.filter((t) => t.status === "todo" || t.status === "in-progress");
      } else {
        result = result.filter((t) => t.status === activeFilter);
      }
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "alpha-asc":
          return a.title.localeCompare(b.title);
        case "alpha-desc":
          return b.title.localeCompare(a.title);
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [tasks, searchTerm, activeFilter, sortBy]);

  // Counts
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

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

      {/* Toolbar: Search, Filters, and Sorting Controls */}
      <div className="bg-secondary-bg border border-border-custom rounded-lg p-4 space-y-3.5 select-none shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3">
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

          {/* Sorters and Quick States */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-border-custom px-2.5 py-1.5 rounded-md text-xs font-semibold text-foreground">
              <ArrowUpDown className="w-3.5 h-3.5 text-secondary-text" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent outline-none cursor-pointer border-none text-xs"
              >
                <option value="newest">Newest Created</option>
                <option value="oldest">Oldest Created</option>
                <option value="alpha-asc">Title: A to Z</option>
                <option value="alpha-desc">Title: Z to A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1 border-t border-border-custom/50">
          <div className="flex bg-neutral-100 border border-border-custom p-0.5 rounded-md text-xs font-semibold text-secondary-text w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all", label: `All (${totalCount})` },
              { id: "todo", label: `To Do (${todoCount})` },
              { id: "in-progress", label: `In Progress (${inProgressCount})` },
              { id: "pending", label: `Pending (${todoCount + inProgressCount})` },
              { id: "done", label: `Completed (${doneCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`
                  px-3 py-1.5 rounded transition uppercase leading-none text-[10px] tracking-tight whitespace-nowrap shrink-0
                  ${activeFilter === tab.id 
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
            {processedTasks.map((task) => (
              <motion.div
                key={task._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="p-4.5 bg-white border border-border-custom rounded-lg shadow-xs hover:border-foreground/45 transition flex items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Status checkbox toggle */}
                  <button
                    onClick={() => 
                      handleQuickStatusChange(task, task.status === "done" ? "todo" : "done")
                    }
                    className="text-secondary-text hover:text-foreground shrink-0 mt-0.5 transition cursor-pointer"
                    aria-label={task.status === "done" ? "Mark todo" : "Mark completed"}
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 className="w-5 h-5 text-foreground" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="min-w-0">
                    <h4 className={`text-xs font-bold tracking-tight text-foreground truncate ${task.status === "done" ? "line-through text-secondary-text" : ""}`}>
                      {task.title}
                    </h4>
                    <p className={`text-xs text-secondary-text leading-normal mt-1 max-w-2xl ${task.status === "done" ? "line-through" : ""}`}>
                      {task.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5 select-none text-[10px]">
                      <span className="text-secondary-text font-semibold uppercase bg-secondary-bg px-2 py-0.5 border border-border-custom rounded whitespace-nowrap">
                        Created {new Date(task.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                      
                      <span className="text-secondary-text font-semibold select-none">•</span>

                      {/* inline selector */}
                      <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                        <span className="text-secondary-text font-medium">Status:</span>
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
                    onClick={() => setEditingTask(task)}
                    className="text-secondary-text hover:text-foreground p-1 hover:bg-hover-custom rounded transition cursor-pointer"
                    aria-label="Edit task"
                  >
                    <Edit2 className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => setDeletingTaskId(task._id)}
                    className="text-secondary-text hover:text-foreground p-1 hover:bg-hover-custom rounded transition cursor-pointer"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          title="No tasks found"
          description={
            searchTerm.trim() !== ""
              ? `No tasks match search term "${searchTerm}". Try query edits.`
              : activeFilter === "all"
              ? "You haven't logged any tasks yet. Create one to get started!"
              : `You have no tasks matching filter status "${activeFilter}".`
          }
          actionText={activeFilter === "all" || searchTerm.trim() !== "" ? "Create Task" : undefined}
          onAction={() => setCreateModalOpen(true)}
        />
      )}

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
