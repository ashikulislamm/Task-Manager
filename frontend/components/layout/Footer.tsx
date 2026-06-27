"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "../shared/Logo";

interface FooterProps {
  minimal?: boolean; // If true, matches the simplified login/register footer
}

export const Footer: React.FC<FooterProps> = ({ minimal = false }) => {
  return (
    <footer className="w-full bg-white border-t border-border-custom py-12 px-6 text-xs text-secondary-text shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Left trademark */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <Logo size="sm" />
          <p className="text-xs text-secondary-text mt-2">
            © {new Date().getFullYear()} Planora Inc. All rights reserved.
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 select-none font-semibold text-xs text-secondary-text">
          {minimal ? (
            <>
              <Link href="/" className="hover:text-foreground transition">Home</Link>
              <a href="#" className="hover:text-foreground transition">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition">Terms of Service</a>
            </>
          ) : (
            <>
              <a href="#features" className="hover:text-foreground transition">Features</a>
              <a href="#about" className="hover:text-foreground transition">About</a>
              <a href="#" className="hover:text-foreground transition">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition">Terms of Service</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition">GitHub</a>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};
