"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string;
  className?: string;
  rightAction?: React.ReactNode;
}

const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.02,
    },
  },
};

const letterVariants: Variants = {
  initial: {
    y: 0,
    color: "#71717a", // zinc-500
    opacity: 0.8,
  },
  animate: {
    y: "-110%",
    color: "#a1a1aa", // zinc-400
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 320,
      damping: 22,
    },
  },
};

export const Input = ({
  label,
  className = "",
  value,
  rightAction,
  type = "text",
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const showLabel = isFocused || (value !== undefined && value.length > 0);

  return (
    <div className={cn("relative pt-4", className)}>
      <motion.div
        className="absolute top-5 -translate-y-1/2 pointer-events-none select-none flex items-center"
        variants={containerVariants}
        initial="initial"
        animate={showLabel ? "animate" : "initial"}
      >
        {label.split("").map((char, index) => (
          <motion.span
            key={index}
            className="inline-block text-[11px] font-mono tracking-wider"
            variants={letterVariants}
            style={{ willChange: "transform" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.div>

      <div className="flex items-center gap-2 border-b border-zinc-800 transition-colors focus-within:border-zinc-400">
        <input
          type={type}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          value={value}
          {...props}
          className="outline-none py-1.5 w-full text-xs font-mono text-zinc-100 bg-transparent placeholder-transparent focus:outline-none"
        />
        {rightAction && (
          <div className="flex-none pb-1">
            {rightAction}
          </div>
        )}
      </div>
    </div>
  );
};

export default Input;
