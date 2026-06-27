"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/shared/Toast";
import { Input } from "../../components/shared/Input";
import { Button } from "../../components/shared/Button";
import { Logo } from "../../components/shared/Logo";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, loading } = useAuth();
  const { success, error } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data);
      success("Welcome back! Login successful.");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Invalid email or password. Please try again.";
      error(errMsg);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white selection:bg-neutral-100 selection:text-foreground">
      {/* Left Visual Sidebar (Desktop only) */}
      <div className="hidden lg:flex lg:col-span-5 bg-neutral-950 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-neutral-900">
        {/* Glow Effects */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-zinc-800 rounded-full blur-[90px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-12 right-12 w-72 h-72 bg-neutral-800 rounded-full blur-[100px] opacity-35 pointer-events-none" />
        
        {/* Top Header */}
        <Link href="/" className="relative z-10 flex items-center select-none group">
          <Logo variant="light" size="md" />
        </Link>

        {/* Center Marketing Visual */}
        <div className="relative z-10 space-y-8 my-auto">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/60 text-xs font-semibold text-neutral-400">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Deep work mode activated</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Stay focused, <br />
              accomplish more.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm">
              Planora streamlines your task list, provides distraction-free Pomodoro environments, and graphs your workspace productivity statistics.
            </p>
          </div>

          {/* Floating task widget mockup */}
          <div className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-2xl backdrop-blur-sm space-y-4 shadow-xl max-w-sm">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Active Workspace</span>
              <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">Syncing</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="line-through text-neutral-500">Synthesize audio alerts</span>
                <CheckCircle2 className="w-4 h-4 text-neutral-500 stroke-[2.5]" />
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-200">
                <span>Refactor authentication views</span>
                <div className="w-3.5 h-3.5 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Deploy frontend optimization build</span>
                <span className="text-[9px] bg-neutral-850 px-1.5 py-0.5 rounded text-neutral-400 font-semibold uppercase tracking-wider">Todo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[10px] text-neutral-500">
          Planora is a registered trademark. Designed by Md Ashikul Islam.
        </p>
      </div>

      {/* Right Column (Form Column) */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 md:p-16 min-h-screen">
        {/* Top Header details */}
        <div className="flex justify-between items-center">
          <Link href="/" className="lg:hidden">
            <Logo size="md" />
          </Link>
          <Link href="/" className="text-xs font-semibold text-secondary-text hover:text-foreground transition flex items-center gap-1.5 group select-none ml-auto">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-12">
          <div className="space-y-6">
            <div className="text-left space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-secondary-text">
                Enter your credentials below to access your workspace.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                error={errors.email?.message}
                disabled={loading}
                className="text-sm"
                {...register("email")}
              />

              <div className="flex flex-col gap-1 text-left relative">
                <div className="absolute right-0 top-0.5 z-10">
                  <button
                    type="button"
                    onClick={() => success("Password reset instructions sent to email.")}
                    className="text-xs font-semibold text-secondary-text hover:text-foreground transition underline select-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  disabled={loading}
                  className="text-sm"
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-secondary-text hover:text-foreground transition cursor-pointer p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-foreground rounded"
                      disabled={loading}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  {...register("password")}
                />
              </div>

              {/* Remember me option */}
              <div className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-3.5 h-3.5 accent-foreground rounded border-border-custom text-foreground outline-none cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-secondary-text cursor-pointer font-medium">
                  Remember me
                </label>
              </div>

              <Button type="submit" className="w-full mt-2 shadow-xs" isLoading={loading}>
                Sign In
              </Button>
            </form>

            {/* Footer Link */}
            <div className="text-center pt-2">
              <p className="text-sm text-secondary-text">
                Don't have an account?{" "}
                <Link href="/register">
                  <span className="font-semibold text-foreground hover:underline cursor-pointer">
                    Create one
                  </span>
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between text-[11px] text-secondary-text select-none pt-8 border-t border-neutral-100">
          <span>© {new Date().getFullYear()} Planora.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
