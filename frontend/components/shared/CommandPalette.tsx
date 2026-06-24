"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, User, Settings, LayoutDashboard, LogOut, CornerDownLeft, CheckSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTaskTrigger: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onCreateTaskTrigger,
}) => {
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions = [
    {
      id: "create-task",
      title: "Create New Task",
      subtitle: "Add a new task to your dashboard",
      icon: Plus,
      perform: () => {
        onClose();
        onCreateTaskTrigger();
      },
    },
    {
      id: "go-dashboard",
      title: "Go to Dashboard",
      subtitle: "View your productivity stats and task lists",
      icon: LayoutDashboard,
      perform: () => {
        router.push("/dashboard");
        onClose();
      },
    },
    {
      id: "go-tasks",
      title: "Go to My Tasks",
      subtitle: "View, filter, and organize all tasks",
      icon: CheckSquare,
      perform: () => {
        router.push("/dashboard/tasks");
        onClose();
      },
    },
    {
      id: "go-profile",
      title: "Go to Profile",
      subtitle: "View user stats and details",
      icon: User,
      perform: () => {
        router.push("/dashboard/profile");
        onClose();
      },
    },
    {
      id: "go-settings",
      title: "Go to Settings",
      subtitle: "Update profile name, email, or change password",
      icon: Settings,
      perform: () => {
        router.push("/dashboard/settings");
        onClose();
      },
    },
    {
      id: "logout",
      title: "Logout Session",
      subtitle: "Securely sign out of your account",
      icon: LogOut,
      perform: () => {
        logout();
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter(
    (action) =>
      action.title.toLowerCase().includes(search.toLowerCase()) ||
      action.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % filteredActions.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredActions[activeIndex]) {
            filteredActions[activeIndex].perform();
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, filteredActions, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black pointer-events-auto"
          />

          {/* Palette Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="
              relative w-full max-w-xl bg-white border border-border-custom
              rounded-xl shadow-2xl z-10 overflow-hidden flex flex-col pointer-events-auto
            "
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-custom bg-white">
              <Search className="w-4.5 h-4.5 text-secondary-text shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search actions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                className="w-full text-sm outline-none text-foreground bg-transparent placeholder-secondary-text"
              />
              <span className="text-[10px] font-semibold text-secondary-text bg-secondary-bg border border-border-custom px-1.5 py-0.5 rounded uppercase">
                esc
              </span>
            </div>

            {/* Actions List */}
            <div
              ref={listRef}
              className="max-h-[300px] overflow-y-auto p-2 bg-white flex flex-col gap-0.5"
            >
              {filteredActions.length > 0 ? (
                filteredActions.map((action, idx) => {
                  const Icon = action.icon;
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      key={action.id}
                      onClick={() => action.perform()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`
                        flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition select-none
                        ${isActive ? "bg-hover-custom text-foreground" : "bg-white text-secondary-text"}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${isActive ? "bg-white border border-border-custom text-foreground" : "text-secondary-text"}`}>
                          <Icon className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-xs font-semibold ${isActive ? "text-foreground" : "text-foreground"}`}>
                            {action.title}
                          </span>
                          <span className="text-[11px] text-secondary-text leading-tight mt-0.5">
                            {action.subtitle}
                          </span>
                        </div>
                      </div>
                      
                      {isActive && (
                        <div className="flex items-center gap-1 text-[10px] text-secondary-text font-medium uppercase shrink-0">
                          <span>select</span>
                          <CornerDownLeft className="w-3 h-3 text-secondary-text" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-secondary-text">
                  No commands found matching "{search}"
                </div>
              )}
            </div>

            {/* Footer helper */}
            <div className="px-4 py-2.5 border-t border-border-custom bg-secondary-bg text-[10px] text-secondary-text flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-0.5">
                  <span className="font-semibold px-1 py-0.5 border border-border-custom rounded bg-white">↑↓</span> navigate
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="font-semibold px-1 py-0.5 border border-border-custom rounded bg-white">enter</span> execute
                </span>
              </div>
              <div>
                Press <span className="font-semibold px-1 py-0.5 border border-border-custom rounded bg-white">Ctrl K</span> to toggle palette
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
