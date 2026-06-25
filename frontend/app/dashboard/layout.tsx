"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CheckSquare, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Plus,
  Command,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { CommandPalette } from "../../components/shared/CommandPalette";
import { Button } from "../../components/shared/Button";

// Shared context for modals and palette triggers in children
interface DashboardLayoutContextType {
  openCreateModal: () => void;
  triggerSearch: () => void;
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | undefined>(undefined);

export const useDashboardLayout = () => {
  const context = useContext(DashboardLayoutContext);
  if (context === undefined) {
    throw new Error("useDashboardLayout must be used inside DashboardLayout");
  }
  return context;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const isFocusPage = pathname === "/dashboard/focus";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Close mobile sidebar on path change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Global keydown listener for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center font-bold text-sm text-background select-none">
            F
          </div>
          <span className="text-xs text-secondary-text tracking-wider">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Route Guard in AuthContext handles redirect to /login
  }

  // Generate initials for avatar
  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Tasks", href: "/dashboard/tasks", icon: CheckSquare },
    { label: "Focus Space", href: "/dashboard/focus", icon: Clock },
    { label: "Profile", href: "/dashboard/profile", icon: User },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  if (isFocusPage) {
    return (
      <DashboardLayoutContext.Provider
        value={{
          openCreateModal: () => setCreateModalOpen(true),
          triggerSearch: () => setCommandPaletteOpen(true),
          createModalOpen,
          setCreateModalOpen,
        }}
      >
        <div className="min-h-screen flex bg-white text-foreground font-sans selection:bg-neutral-100 selection:text-foreground">
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-white max-w-5xl w-full mx-auto">
            {children}
          </main>
        </div>
      </DashboardLayoutContext.Provider>
    );
  }

  return (
    <DashboardLayoutContext.Provider
      value={{
        openCreateModal: () => setCreateModalOpen(true),
        triggerSearch: () => setCommandPaletteOpen(true),
        createModalOpen,
        setCreateModalOpen,
      }}
    >
      <div className="min-h-screen flex bg-white text-foreground font-sans selection:bg-neutral-100 selection:text-foreground">
        
        {/* Desktop Sidebar (Left Panel) */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border-custom bg-secondary-bg shrink-0">
          {/* Logo */}
          <div className="h-16 px-6 border-b border-border-custom flex items-center gap-2.5 bg-secondary-bg select-none">
            <div className="w-5.5 h-5.5 rounded bg-foreground flex items-center justify-center font-bold text-xs text-background">
              F
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">Focus</span>
            <span className="text-xs font-bold text-secondary-text border border-border-custom bg-white px-1.5 py-0.5 rounded leading-none uppercase ml-auto">
              SaaS
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
              
              return (
                <Link key={idx} href={item.href}>
                  <span
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-colors cursor-pointer
                      ${isActive 
                        ? "bg-white border border-border-custom text-foreground" 
                        : "text-secondary-text hover:text-foreground hover:bg-hover-custom"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom user profile logout info */}
          <div className="p-4 border-t border-border-custom bg-secondary-bg">
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold text-secondary-text hover:text-foreground hover:bg-hover-custom rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer (Overlay & Panel) */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black pointer-events-auto"
              />
              
              {/* Sidebar Panel */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
                className="relative flex flex-col w-72 max-w-[80vw] h-full border-r border-border-custom bg-secondary-bg p-5 z-10 pointer-events-auto"
              >
                {/* Header inside drawer */}
                <div className="flex items-center justify-between mb-8 select-none">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center font-bold text-xs text-background">
                      F
                    </div>
                    <span className="font-semibold text-sm tracking-tight text-foreground">Focus</span>
                  </div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="text-secondary-text hover:text-foreground p-1 rounded-md hover:bg-hover-custom"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation Links inside drawer */}
                <nav className="flex-1 space-y-1.5">
                  {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                    
                    return (
                      <Link key={idx} href={item.href}>
                        <span
                          className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition cursor-pointer
                            ${isActive 
                              ? "bg-white border border-border-custom text-foreground shadow-sm" 
                              : "text-secondary-text hover:text-foreground hover:bg-hover-custom"
                            }
                          `}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                      </Link>
                    );
                  })}
                </nav>

                {/* Logout inside drawer */}
                <div className="border-t border-border-custom pt-4">
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-semibold text-secondary-text hover:text-foreground hover:bg-hover-custom rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Dashboard Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navbar */}
          <header className="h-16 border-b border-border-custom flex items-center justify-between px-6 bg-white shrink-0 sticky top-0 z-30">
            {/* Left section: mobile hamburger trigger, or search trigger */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="block md:hidden text-secondary-text hover:text-foreground transition p-1 hover:bg-hover-custom rounded-md"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search Bar - Clicking triggers the command palette */}
              <div 
                onClick={() => setCommandPaletteOpen(true)}
                className="
                  hidden sm:flex items-center gap-2.5 w-full max-w-xs px-3 py-1.5 
                  border border-border-custom rounded-md bg-secondary-bg hover:bg-hover-custom 
                  cursor-pointer transition select-none text-secondary-text text-xs font-medium
                "
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search dashboard...</span>
                <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold border border-border-custom px-1.5 py-0.5 rounded bg-white leading-none">
                  <Command className="w-2 h-2" />
                  <span>K</span>
                </span>
              </div>
            </div>

            {/* Right section: Quick Create & User Avatar Info */}
            <div className="flex items-center gap-4">
              {/* Quick Add Task Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="hidden sm:inline-flex"
              >
                <Plus className="w-4.5 h-4.5 mr-1" />
                <span>New Task</span>
              </Button>

              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="sm:hidden text-secondary-text hover:text-foreground transition p-1 hover:bg-hover-custom rounded-md"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Separation line */}
              <div className="w-px h-6 bg-border-custom hidden sm:block" />

              {/* Profile Shortcut */}
              <Link href="/dashboard/profile" className="flex items-center gap-2 group cursor-pointer select-none">
                <div className="w-8 h-8 rounded-full border border-border-custom bg-secondary-bg flex items-center justify-center text-xs font-bold text-foreground group-hover:bg-hover-custom transition">
                  {getInitials(user.name)}
                </div>
                <div className="hidden lg:flex flex-col text-left shrink-0 max-w-[120px]">
                  <span className="text-xs font-semibold text-foreground truncate leading-tight group-hover:underline">
                    {user.name}
                  </span>
                  <span className="text-xs text-secondary-text truncate leading-none mt-1">
                    {user.email}
                  </span>
                </div>
              </Link>
            </div>
          </header>

          {/* Main scrollable body */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-white max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        {/* Command Palette Overlay */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onCreateTaskTrigger={() => setCreateModalOpen(true)}
        />
      </div>
    </DashboardLayoutContext.Provider>
  );
}
