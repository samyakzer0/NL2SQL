"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface SqlViewerProps {
  sql: string;
  rowCount?: number;
  durationMs?: number;
}

export const SqlViewer = ({ sql, rowCount, durationMs }: SqlViewerProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/80 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-zinc-900/50 px-3.5 py-2">
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">SQL Query</span>
          {rowCount !== undefined && (
            <span className="text-[11px] text-zinc-500">
              {rowCount} {rowCount === 1 ? "row" : "rows"}
              {durationMs !== undefined && ` · ${durationMs}ms`}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="Copy SQL to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3.5 overflow-x-auto text-zinc-200 bg-zinc-950/60 leading-relaxed whitespace-pre-wrap break-all">
        <code>{sql}</code>
      </div>
    </div>
  );
};

export default SqlViewer;
