"use client";

import { useState } from "react";
import { Download, FileJson, Check } from "lucide-react";

interface DataTableProps {
  data: Record<string, any>[];
}

export const DataTable = ({ data }: DataTableProps) => {
  const [copiedJson, setCopiedJson] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-8 text-center text-xs font-mono text-zinc-500">
        Empty result set. 0 rows returned.
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleExportCsv = () => {
    if (!data.length) return;
    const header = columns.join(",");
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `query_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/80 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-zinc-900/50 px-3.5 py-2">
        <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
          Results ({data.length})
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            title="Copy as JSON"
          >
            {copiedJson ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <FileJson className="h-3 w-3" />
                <span>JSON</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            title="Download CSV"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="max-h-[460px] overflow-auto compose-scroll">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur border-b border-white/10 text-zinc-400 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-3 py-2.5 font-medium border-r border-white/5 w-12 text-center text-zinc-600">
                #
              </th>
              {columns.map((col) => (
                <th key={col} className="px-3.5 py-2.5 font-medium border-r border-white/5 last:border-r-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-3 py-2 text-center text-zinc-600 border-r border-white/5 font-mono select-none">
                  {idx + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col];
                  const isNull = val === null || val === undefined;
                  const isNumber = typeof val === "number";
                  return (
                    <td
                      key={col}
                      className={[
                        "px-3.5 py-2 border-r border-white/5 last:border-r-0 whitespace-nowrap",
                        isNull ? "text-zinc-600 italic" : "text-zinc-200",
                        isNumber ? "text-amber-200/90 font-mono" : "",
                      ].join(" ")}
                    >
                      {isNull ? "NULL" : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
