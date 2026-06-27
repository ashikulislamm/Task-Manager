"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Check, X, ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/shared/Toast";
import { Input } from "../../components/shared/Input";
import { Button } from "../../components/shared/Button";
import { Logo } from "../../components/shared/Logo";

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Full Name is required")
      .min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password is too long"),
    confirmPassword: z
      .string()
      .min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: signup, loading } = useAuth();
  const { success, error } = useToast();
  
  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "Weak",
    percentage: "0%",
    colorClass: "bg-red-500",
    textClass: "text-red-500",
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password", "");
  const confirmPasswordValue = watch("confirmPassword", "");

  // Update password strength indicator
  useEffect(() => {
    if (!passwordValue) {
      setPasswordStrength({ 
        score: 0, 
        label: "Weak", 
        percentage: "0%", 
        colorClass: "bg-red-500", 
        textClass: "text-red-500" 
      });
      return;
    }

    let score = 0;
    if (passwordValue.length >= 6) score += 1;
    if (passwordValue.length >= 10) score += 1;
    if (/[A-Z]/.test(passwordValue)) score += 1;
    if (/[0-9]/.test(passwordValue)) score += 1;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 1;

    let label = "Weak";
    let percentage = "25%";
    let colorClass = "bg-red-500";
    let textClass = "text-red-500";

    if (score >= 4) {
      label = "Strong";
      percentage = "100%";
      colorClass = "bg-green-500";
      textClass = "text-green-500";
    } else if (score >= 2) {
      label = "Medium";
      percentage = "60%";
      colorClass = "bg-yellow-500";
      textClass = "text-yellow-500";
    } else {
      label = "Weak";
      percentage = "25%";
      colorClass = "bg-red-500";
      textClass = "text-red-500";
    }

    setPasswordStrength({ score, label, percentage, colorClass, textClass });
  }, [passwordValue]);

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await signup({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      success("Account created successfully! Welcome to Planora.");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Registration failed. Email might already be registered.";
      error(errMsg);
    }
  };

  // Determine if confirm password matches
  const doesConfirmMatch = confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;
  const showMatchStatus = confirmPasswordValue.length > 0;

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
              <span>Built for high performance teams</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Optimize execution, <br />
              track your progress.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm">
              Create an account to start analyzing your focus sessions, completing tasks, and reviewing metrics dashboards instantly.
            </p>
          </div>

          {/* Floating metrics widget mockup */}
          <div className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-2xl backdrop-blur-sm space-y-4 shadow-xl max-w-sm">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Focus Performance</span>
              <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Monthly Analytics
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-neutral-400 select-none">
                <span>Completed Tasks</span>
                <span className="text-white font-bold">42 / 48</span>
              </div>
              {/* Simple grid stats bar chart simulation */}
              <div className="grid grid-cols-5 gap-2 pt-2 items-end h-16">
                <div className="bg-neutral-800 hover:bg-neutral-700 transition h-[40%] rounded-t" title="Mon: 2.5h focus" />
                <div className="bg-neutral-800 hover:bg-neutral-700 transition h-[70%] rounded-t" title="Tue: 4.8h focus" />
                <div className="bg-neutral-700 hover:bg-neutral-600 transition h-[90%] rounded-t" title="Wed: 6.2h focus" />
                <div className="bg-neutral-800 hover:bg-neutral-700 transition h-[50%] rounded-t" title="Thu: 3.5h focus" />
                <div className="bg-white h-[95%] rounded-t" title="Today: 7.2h focus (Peak!)" />
              </div>
              <div className="flex justify-between text-[9px] text-neutral-500 font-semibold px-0.5">
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
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
        <div className="w-full max-w-sm mx-auto my-auto py-8">
          <div className="space-y-6">
            <div className="text-left space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Create an account
              </h2>
              <p className="text-xs sm:text-sm text-secondary-text">
                Fill in the details below to register your workspace.
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                error={errors.name?.message}
                disabled={loading}
                className="text-sm"
                {...register("name")}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                error={errors.email?.message}
                disabled={loading}
                className="text-sm"
                {...register("email")}
              />

              {/* Password field with strength bar */}
              <div className="flex flex-col gap-1.5 text-left">
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

                {/* Password Strength Indicator */}
                {passwordValue && (
                  <div className="space-y-1.5 pt-1.5 select-none">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-secondary-text font-medium">Password strength:</span>
                      <span className={`font-bold uppercase tracking-wider ${passwordStrength.textClass}`}>{passwordStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.colorClass} transition-all duration-300`}
                        style={{ width: passwordStrength.percentage }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password with matched status badge */}
              <div className="flex flex-col gap-1.5 text-left">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  disabled={loading}
                  className="text-sm"
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="text-secondary-text hover:text-foreground transition cursor-pointer p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-foreground rounded"
                      disabled={loading}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  {...register("confirmPassword")}
                />

                {/* Password Matching Status */}
                {showMatchStatus && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold pt-1 select-none">
                    {doesConfirmMatch ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-green-500">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-red-500">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full mt-2 shadow-xs" isLoading={loading}>
                Create Account
              </Button>
            </form>

            {/* Footer Link */}
            <div className="text-center pt-2">
              <p className="text-sm text-secondary-text">
                Already have an account?{" "}
                <Link href="/login">
                  <span className="font-semibold text-foreground hover:underline cursor-pointer">
                    Login
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
