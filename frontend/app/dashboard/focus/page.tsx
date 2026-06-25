"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Play, 
  Pause, 
  X, 
  CheckCircle2, 
  ArrowLeft, 
  Timer, 
  Clock,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../../components/shared/Toast";
import { taskService, Task } from "../../../services/task.service";
import { focusService, FocusSession } from "../../../services/focus.service";
import { Button } from "../../../components/shared/Button";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";

export default function FocusModePage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  
  // Local UI States
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(25); // 25, 50, 90 mins
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [customDurationInput, setCustomDurationInput] = useState<string>("45");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // In seconds
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Queries
  const { data: tasksResponse, isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await taskService.getTasks();
      return res.data;
    },
  });

  const pendingTasks = (tasksResponse || []).filter(t => t.status !== "done");

  const { data: currentSession, isLoading: isSessionLoading, refetch: refetchSession } = useQuery({
    queryKey: ["currentFocus"],
    queryFn: async () => {
      const res = await focusService.getCurrentSession();
      return res.data;
    },
  });

  // Automatically select the first task if not set
  useEffect(() => {
    if (pendingTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(pendingTasks[0]._id);
    }
  }, [pendingTasks, selectedTaskId]);

  // Handle active session loading & synchronization
  useEffect(() => {
    if (currentSession && currentSession.status === "active") {
      const start = new Date(currentSession.startedAt).getTime();
      const durationMs = currentSession.duration * 60 * 1000;
      const elapsedMs = Date.now() - start;
      const remainingMs = durationMs - elapsedMs;

      if (remainingMs <= 0) {
        setTimeLeft(0);
        if (!showCompletionModal) {
          handleTimerComplete();
        }
      } else {
        setTimeLeft(Math.floor(remainingMs / 1000));
        setIsPaused(false);
      }
    }
  }, [currentSession]);

  // Pomodoro Interval Timer
  useEffect(() => {
    if (currentSession && currentSession.status === "active" && !isPaused && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSession, isPaused, timeLeft]);

  // Mutations
  const startSessionMutation = useMutation({
    mutationFn: ({ taskId, duration }: { taskId: string; duration: number }) =>
      focusService.startSession(taskId, duration),
    onSuccess: () => {
      refetchSession();
      success("Focus session started! Deep work mode activated.");
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to start focus session");
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: (status: "completed" | "cancelled") =>
      focusService.endSession(status),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["currentFocus"] });
      queryClient.invalidateQueries({ queryKey: ["focusHistory"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      refetchSession();
      if (variables === "completed") {
        setShowCompletionModal(true);
      } else {
        success("Focus session cancelled.");
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Failed to end focus session");
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "todo" | "in-progress" | "done" }) =>
      taskService.updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      success("Task marked as completed! Excellent work.");
      setShowCompletionModal(false);
    },
  });

  // Callbacks
  const handleStartSession = () => {
    if (!selectedTaskId) {
      error("Please select a task to focus on.");
      return;
    }
    
    let duration = selectedDuration;
    if (isCustomDuration) {
      const parsed = parseInt(customDurationInput, 10);
      if (isNaN(parsed) || parsed <= 0) {
        error("Please enter a valid duration greater than 0 minutes.");
        return;
      }
      if (parsed > 240) {
        error("Maximum focus session duration is 240 minutes.");
        return;
      }
      duration = parsed;
    }

    startSessionMutation.mutate({
      taskId: selectedTaskId,
      duration: duration,
    });
  };

  const handleTimerComplete = () => {
    // End session as completed on backend
    endSessionMutation.mutate("completed");
    
    // Play alert sound if available
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav");
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.warn("Could not play timer sound:", e);
    }
  };

  const handleCancelSession = () => {
    setShowCancelConfirm(false);
    endSessionMutation.mutate("cancelled");
  };

  // Helper formatting minutes & seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const activeTask = currentSession?.taskId as Task | undefined;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between select-none max-w-xl mx-auto py-10 px-4">
      {/* Top distractor-free Navigation Header */}
      <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
        {currentSession?.status === "active" ? (
          <button 
            onClick={() => setShowExitConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition font-bold uppercase cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        ) : (
          <Link href="/dashboard">
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition font-bold uppercase cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </span>
          </Link>
        )}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-[10px] font-bold text-neutral-600 uppercase tracking-wide">
          <Sparkles className="w-3 h-3 text-neutral-800" />
          <span>Focus Space</span>
        </div>
      </div>

      {/* Main Focus Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <AnimatePresence mode="wait">
          {isSessionLoading || isTasksLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="animate-spin w-8 h-8 border-2 border-neutral-800 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-neutral-500 mt-3 font-semibold uppercase tracking-wider">Syncing focus timer...</p>
            </motion.div>
          ) : currentSession?.status === "active" ? (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full text-center space-y-8"
            >
              {/* Timer text display */}
              <div className="relative inline-flex items-center justify-center">
                {/* Circular indicator backing */}
                <div className="text-7xl sm:text-8xl font-black tracking-tight text-neutral-900 font-mono tabular-nums leading-none">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Task Detail Card */}
              <div className="max-w-md mx-auto p-6 border border-neutral-200 rounded-2xl bg-neutral-50 text-left space-y-3.5 shadow-sm">
                <div>
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">CURRENT MISSION</span>
                  <h3 className="text-sm font-bold text-neutral-900 mt-0.5">{activeTask?.title}</h3>
                </div>
                {activeTask?.description && (
                  <p className="text-xs text-neutral-500 leading-relaxed truncate">{activeTask.description}</p>
                )}
                <div className="flex items-center gap-1.5 select-none pt-1">
                  <span className="text-[9px] text-neutral-600 font-bold uppercase border border-neutral-300 bg-white px-2 py-0.5 rounded leading-none">
                    {activeTask?.category}
                  </span>
                  <span className="text-[9px] text-neutral-600 font-bold uppercase border border-neutral-300 bg-white px-2 py-0.5 rounded leading-none">
                    {activeTask?.priority} Priority
                  </span>
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition border border-neutral-300 shadow-sm
                    ${isPaused 
                      ? "bg-neutral-900 text-white hover:bg-neutral-800" 
                      : "bg-white text-neutral-900 hover:bg-neutral-50"
                    }
                  `}
                  aria-label={isPaused ? "Resume Timer" : "Pause Timer"}
                >
                  {isPaused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-14 h-14 rounded-full bg-white text-neutral-500 border border-neutral-200 hover:text-neutral-950 hover:bg-neutral-50 flex items-center justify-center cursor-pointer transition shadow-sm"
                  aria-label="Cancel session"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="text-center space-y-2.5">
                <div className="w-12 h-12 bg-neutral-900 text-white border border-neutral-800 flex items-center justify-center rounded-xl mx-auto shadow-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-900">Setup Focus Timer</h2>
                <p className="text-xs text-neutral-500 leading-tight">Eliminate distractions and focus on your active goal.</p>
              </div>

              <div className="space-y-5 text-left">
                {/* Task Selection */}
                <div className="flex flex-col gap-1.5 select-none">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Focus Target</label>
                  {pendingTasks.length > 0 ? (
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-900 outline-none cursor-pointer focus:border-neutral-900"
                    >
                      {pendingTasks.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.title} [{t.category.toUpperCase()}]
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 border border-dashed border-neutral-300 rounded-lg text-center bg-neutral-50">
                      <p className="text-xs text-neutral-500">No active tasks available. Create one first!</p>
                      <Link href="/dashboard" className="text-xs text-neutral-900 font-bold underline mt-1.5 block">
                        Go to Dashboard
                      </Link>
                    </div>
                  )}
                </div>

                {/* Duration select */}
                <div className="flex flex-col gap-1.5 select-none">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Duration Setting</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 25, label: "25 Min" },
                      { val: 50, label: "50 Min" },
                      { val: 90, label: "90 Min" }
                    ].map((dur) => (
                      <button
                        key={dur.val}
                        type="button"
                        onClick={() => {
                          setIsCustomDuration(false);
                          setSelectedDuration(dur.val);
                        }}
                        className={`
                          py-2.5 text-[10px] font-bold rounded-lg border transition cursor-pointer text-center leading-none
                          ${!isCustomDuration && selectedDuration === dur.val
                            ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                            : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          }
                        `}
                      >
                        {dur.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDuration(true);
                        const mins = Number(customDurationInput);
                        if (mins > 0) {
                          setSelectedDuration(mins);
                        }
                      }}
                      className={`
                        py-2.5 text-[10px] font-bold rounded-lg border transition cursor-pointer text-center leading-none
                        ${isCustomDuration
                          ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                          : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        }
                      `}
                    >
                      Custom
                    </button>
                  </div>

                  {isCustomDuration && (
                    <div className="flex items-center gap-2 mt-2 p-3 border border-neutral-200 rounded-lg bg-neutral-50 animate-fadeIn">
                      <label htmlFor="custom-minutes" className="text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                        Mins:
                      </label>
                      <input
                        id="custom-minutes"
                        type="number"
                        min={1}
                        max={240}
                        value={customDurationInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomDurationInput(val);
                          const mins = Number(val);
                          if (mins > 0) {
                            setSelectedDuration(mins);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-md text-neutral-900 outline-none focus:border-neutral-900"
                        placeholder="Minutes"
                      />
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  className="w-full py-3 mt-2"
                  onClick={handleStartSession}
                  disabled={pendingTasks.length === 0 || startSessionMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  <span>Start Focus Session</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer minimal info */}
      <div className="pt-6 border-t border-neutral-100 text-center select-none">
        <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-widest leading-none">
          Planora Focus Timer
        </p>
      </div>

      {/* exit confirmation dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          window.location.href = "/dashboard";
        }}
        title="Leave Focus Space?"
        message="Your focus timer will continue running in the background. You can return anytime to resume or end the session."
        confirmText="Leave Focus Space"
        cancelText="Stay Focused"
      />

      {/* cancel confirmation dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelSession}
        title="Cancel Focus Session?"
        message="Are you sure you want to cancel this Pomodoro session? Your session progress will not be logged in your focus stats."
        confirmText="Cancel Session"
        cancelText="Keep Focused"
      />

      {/* session completion congratulations dialog */}
      <AnimatePresence>
        {showCompletionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white border border-neutral-200 rounded-2xl shadow-2xl p-6 text-center space-y-5 z-10"
            >
              <div className="w-12 h-12 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-neutral-950">Focus Session Complete!</h3>
                <p className="text-xs text-neutral-500 leading-normal">
                  Well done! You successfully logged <strong>{currentSession?.duration} minutes</strong> of focus time.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {activeTask && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      updateTaskStatusMutation.mutate({
                        id: activeTask._id,
                        status: "done"
                      });
                    }}
                    disabled={updateTaskStatusMutation.isPending}
                  >
                    Mark Task Done
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setShowCompletionModal(false);
                    refetchSession();
                  }}
                >
                  Continue Working
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
