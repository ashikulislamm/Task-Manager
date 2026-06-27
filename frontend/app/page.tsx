"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, BarChart3, Settings2, Sparkles } from "lucide-react";
import { Button } from "../components/shared/Button";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

export default function LandingPage() {
  const { user } = useAuth();

  // State for interactive demo
  const [tasks, setTasks] = useState([
    { id: 1, text: "Define product design systems and grids", completed: true },
    { id: 2, text: "Synthesize Web Audio API completion chimes", completed: true },
    { id: 3, text: "Redesign landing page interactive mockups", completed: false },
    { id: 4, text: "Implement secure HTTP-only cookies in backend", completed: false },
  ]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(1500); // 25:00

  // Pomodoro countdown simulation
  useEffect(() => {
    let interval: any;
    if (timerRunning) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            // Simulate playing the synthesizer chime sound inside browser on complete
            try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(523.25, now); // C5
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.5);
              }
            } catch {}
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedTasks = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedTasks / tasks.length) * 100);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const features = [
    {
      icon: CheckCircle2,
      title: "Task Management",
      description: "Organize, tag, and sort your tasks with custom statuses. Keep your focus where it belongs."
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Analyze your completion rates with productivity widgets and active progress analytics."
    },
    {
      icon: Settings2,
      title: "Account Management",
      description: "Manage your profile information, password security, and options through clean forms."
    },
    {
      icon: Shield,
      title: "Secure Authentication",
      description: "Rest assured with HTTP-only, secure, strict cookie authentication keeping your sessions safe."
    }
  ];

  return (
    <div className="min-h-full flex flex-col bg-white text-foreground selection:bg-neutral-100 selection:text-foreground">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden flex-1 flex flex-col justify-center items-center px-6 py-20 md:py-32 text-center max-w-7xl mx-auto w-full">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-neutral-200/40 rounded-full blur-[110px] pointer-events-none z-0" />
        <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-zinc-150/50 rounded-full blur-[80px] pointer-events-none z-0" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border-custom bg-secondary-bg text-xs font-semibold text-secondary-text tracking-wide uppercase mb-8 animate-fade-in select-none">
            <Sparkles className="w-3.5 h-3.5 text-foreground animate-pulse" />
            <span>Introducing Planora Task Manager</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-[80px] font-black tracking-tight leading-[1.03] mb-8 font-sans">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-500">
              Organize Tasks.
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-650">
              Stay Focused.
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-800 to-neutral-400">
              Get Things Done.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-secondary-text max-w-xl mb-10 leading-relaxed">
            A clean and modern task manager built to help you stay productive every day. Grayscale aesthetics, integrated focus states, and fluid interface details built for creators.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
            <Link href={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto group relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(9,9,11,0.12)]">
                Get Started for Free
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <a href="#demo" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-neutral-300 hover:border-foreground hover:bg-neutral-50 transition-all">
                View Interactive Demo
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Live Interactive Mockup Section */}
      <section id="demo" className="relative max-w-5xl mx-auto px-6 pb-24 z-10 w-full">
        <div className="relative rounded-2xl border border-border-custom bg-white shadow-2xl p-6 sm:p-8 overflow-hidden group">
          {/* Top header bar */}
          <div className="flex items-center justify-between border-b border-border-custom pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-neutral-200" />
              <span className="w-3 h-3 rounded-full bg-neutral-200" />
              <span className="w-3 h-3 rounded-full bg-neutral-200" />
              <span className="text-xs text-secondary-text font-medium ml-2 font-mono">Planora Your Daily Task Manager</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Task list Column (2 cols) */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Workspace Tasks</h3>
                <span className="text-xs text-secondary-text font-semibold">
                  {completedTasks} of {tasks.length} Completed ({progressPercent}%)
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-foreground transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                      task.completed 
                        ? "bg-secondary-bg border-neutral-200/80 opacity-70" 
                        : "bg-white border-neutral-200 hover:border-neutral-350 hover:shadow-3xs"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                        task.completed 
                          ? "bg-foreground border-foreground text-white" 
                          : "border-neutral-300"
                      }`}>
                        {task.completed && <CheckCircle2 className="w-3 h-3 stroke-[3] text-white" />}
                      </div>
                      <span className={`text-xs font-semibold ${task.completed ? "line-through text-secondary-text" : "text-foreground"}`}>
                        {task.text}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      task.completed 
                        ? "bg-neutral-200 text-neutral-600" 
                        : "bg-zinc-100 text-foreground"
                    }`}>
                      {task.completed ? "Done" : "Todo"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pomodoro Timer Column (1 col) */}
            <div className="p-6 bg-secondary-bg border border-border-custom rounded-xl flex flex-col justify-between items-center text-center">
              <div className="w-full">
                <span className="text-[10px] font-bold text-secondary-text tracking-widest uppercase mb-1 block">Focus Session</span>
                <h4 className="text-xs font-bold text-foreground mb-4 truncate max-w-full">Dashboard Polish</h4>
                
                {/* Visual Timer ring */}
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" className="stroke-neutral-200 stroke-[3]" fill="transparent" />
                    <circle 
                      cx="56" 
                      cy="56" 
                      r="48" 
                      className="stroke-foreground stroke-[4] transition-all duration-1000" 
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - secondsLeft / 1500)}
                      fill="transparent" 
                    />
                  </svg>
                  <div className="absolute text-xl font-bold font-mono tracking-tight text-foreground select-none">
                    {formatTimer(secondsLeft)}
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2">
                <Button 
                  onClick={() => setTimerRunning(!timerRunning)} 
                  variant={timerRunning ? "outline" : "primary"} 
                  size="sm" 
                  className="w-full justify-center text-xs font-bold"
                >
                  {timerRunning ? "Pause Timer" : "Start Focus Timer"}
                </Button>
                <button 
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(1500);
                  }}
                  className="text-[10px] text-secondary-text font-bold hover:text-foreground transition underline cursor-pointer select-none"
                >
                  Reset Timer
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="border-t border-border-custom bg-secondary-bg py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
              Designed for high performance execution.
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
              Every detail is meticulously polished to reduce visual noise and speed up interactions, helping you focus entirely on executing your goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={i} 
                  className="p-6 bg-white border border-border-custom rounded-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-neutral-400 flex flex-col group/card relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-neutral-300 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                  
                  <div className="w-9 h-9 rounded-lg border border-border-custom bg-secondary-bg flex items-center justify-center text-foreground mb-5 group-hover/card:bg-neutral-900 group-hover/card:text-white transition-all duration-300">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground tracking-tight mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-secondary-text leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="border-t border-border-custom bg-white py-24 px-6 relative overflow-hidden">
        {/* Glow behind CTA */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-neutral-100 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto rounded-3xl bg-neutral-950 border border-neutral-800 p-10 md:p-16 text-center text-white relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-zinc-800 rounded-full blur-[80px] opacity-40 pointer-events-none" />
          
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Be the architect of your own focus.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Join users globally who manage task execution and Pomodoro focus routines from a single minimalist workspace.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto bg-white text-neutral-950 hover:bg-neutral-100 hover:shadow-md transition-all font-bold">
                Get Started Now
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-neutral-800 text-white hover:bg-neutral-900 transition-all">
                Log In to Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
