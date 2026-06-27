import React from "react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light"; // default uses text-foreground, light uses text-white
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  iconOnly = false, 
  size = "md", 
  variant = "default" 
}) => {
  const sizeConfig = {
    sm: { container: "w-6 h-6 p-0.5 rounded", text: "text-sm", gap: "gap-1.5" },
    md: { container: "w-8 h-8 p-1 rounded-md", text: "text-base", gap: "gap-2" },
    lg: { container: "w-10 h-10 p-1.5 rounded-lg", text: "text-xl", gap: "gap-2.5" },
    xl: { container: "w-12 h-12 p-2 rounded-xl", text: "text-2xl", gap: "gap-3" },
  }[size];

  const textClass = variant === "light" ? "text-white" : "text-foreground";

  return (
    <div className={`flex items-center ${sizeConfig.gap} ${className} select-none group`}>
      {/* Logo Image in a modern white backing badge */}
      <div className={`bg-white border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0 ${sizeConfig.container}`}>
        <img
          src="/LOGO.png"
          alt="Planora Logo"
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      
      {!iconOnly && (
        <span className={`font-bold tracking-tight ${textClass} font-sans`}>
          Planora
        </span>
      )}
    </div>
  );
};
