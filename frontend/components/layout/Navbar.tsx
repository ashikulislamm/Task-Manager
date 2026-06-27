"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowLeft } from "lucide-react";
import { Button } from "../shared/Button";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "../shared/Logo";

interface NavbarProps {
  minimal?: boolean; // If true, shows the simplified "Back to Home" navbar
}

export const Navbar: React.FC<NavbarProps> = ({ minimal = false }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-custom bg-white/85 backdrop-blur-md shrink-0 select-none">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center select-none group">
          <Logo size="md" />
        </Link>

        {minimal ? (
          /* Minimal Back to Home Link */
          <Link href="/" className="text-xs font-semibold text-secondary-text hover:text-foreground transition flex items-center gap-1 group select-none">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </Link>
        ) : (
          /* Full Responsive Navbar */
          <>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-secondary-text uppercase tracking-wider">
              <a href="#features" className="relative py-1 hover:text-foreground transition-colors group/navlink">
                Features
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-foreground transition-all duration-300 group-hover/navlink:w-full" />
              </a>
              <a href="#about" className="relative py-1 hover:text-foreground transition-colors group/navlink">
                About
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-foreground transition-all duration-300 group-hover/navlink:w-full" />
              </a>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">Go to Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <span className="text-xs font-bold text-secondary-text hover:text-foreground transition cursor-pointer px-3 py-2">
                      Login
                    </span>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="block md:hidden text-secondary-text hover:text-foreground transition p-1.5 hover:bg-hover-custom rounded-md"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Dropdown Panel */}
      <AnimatePresence>
        {!minimal && isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border-custom bg-white overflow-hidden shadow-sm"
          >
            <div className="flex flex-col gap-4.5 px-6 py-5">
              <a
                href="#features"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-secondary-text uppercase tracking-wider hover:text-foreground transition"
              >
                Features
              </a>
              <a
                href="#about"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-secondary-text uppercase tracking-wider hover:text-foreground transition"
              >
                About
              </a>
              
              <div className="border-t border-border-custom pt-4 flex flex-col gap-2">
                {user ? (
                  <Link href="/dashboard" onClick={() => setIsOpen(false)} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">Go to Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsOpen(false)} className="w-full text-center">
                      <span className="text-xs font-bold text-secondary-text hover:text-foreground transition block py-2.5">
                        Login
                      </span>
                    </Link>
                    <Link href="/register" onClick={() => setIsOpen(false)} className="w-full">
                      <Button variant="primary" size="sm" className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
