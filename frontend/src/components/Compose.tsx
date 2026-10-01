"use client";

import React, { useRef, useEffect } from "react";
import { Loader2, ArrowUpRight } from "lucide-react";

export type ComposeProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  className?: string;
};

export function Compose({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask a question about your database in natural language…",
  autoFocus = true,
  isLoading = false,
  className = "",
}: ComposeProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && taRef.current) {
      taRef.current.focus();
    }
  }, [autoFocus]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit(value);
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Auto-grow textarea up to max-height
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  const submit = () => {
    if (value.trim() && !isLoading) {
      onSubmit(value);
    }
  };

  return (
    <div className={["compose-root relative isolate w-full", className].join(" ")}>
      {/* Animated Conic Glow Ring on focus */}
      <div
        aria-hidden
        className="compose-ring pointer-events-none absolute -inset-[2px] -z-10 rounded-[18px] blur-[3px]"
      />

      <div className="relative rounded-2xl border border-white/10 bg-zinc-900/90 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_40px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-colors duration-200">
        <div className="relative">
          <textarea
            ref={taRef}
            value={value}
            rows={3}
            placeholder={placeholder}
            spellCheck={false}
            onChange={handleTextareaChange}
            onKeyDown={onKeyDown}
            className="compose-scroll relative block min-h-[96px] max-h-[220px] w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-[1.6] text-zinc-100 placeholder:text-zinc-500 caret-zinc-100 outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="hidden sm:inline">Execution shortcut</span>
            <span className="inline-flex items-center gap-0.5">
              <Kbd>⌘</Kbd><Kbd>↵</Kbd>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {value.length > 0 && !isLoading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
              >
                clear
              </button>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={!value.trim() || isLoading}
              className="group inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-950 shadow-sm transition-all duration-150 hover:bg-zinc-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-900" />
                  <span>Running</span>
                </>
              ) : (
                <>
                  <span>Execute</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px] leading-none text-zinc-400">
      {children}
    </kbd>
  );
}

export default Compose;
