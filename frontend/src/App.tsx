"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, SlidersHorizontal, AlertCircle, Database, Sparkles } from "lucide-react";
import Input from "@/components/Input";
import Compose from "@/components/Compose";
import SqlViewer from "@/components/SqlViewer";
import DataTable from "@/components/DataTable";
import Background from "@/components/Background";

interface QueryResult {
  status: string;
  sql_query: string;
  row_count: number;
  data: Record<string, any>[];
  durationMs?: number;
}

const SAMPLE_QUERIES = [
  "Show all users and their registered email addresses",
  "List products with stock under 50 ordered by price descending",
  "Find total revenue and order count for each user",
  "Show all orders placed between 25th July and 1st August",
];

export function App() {
  const [dbUri, setDbUri] = useState<string>("sqlite:///sample.db");
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(true);

  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  // Load saved connection settings from localStorage
  useEffect(() => {
    const savedUri = localStorage.getItem("nl2sql_db_uri");
    if (savedUri) setDbUri(savedUri);

    const savedKey = localStorage.getItem("nl2sql_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleDbUriChange = (val: string) => {
    setDbUri(val);
    localStorage.setItem("nl2sql_db_uri", val);
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem("nl2sql_api_key", val);
  };

  const handleExecute = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const payload: Record<string, any> = {
        db_connection_uri: dbUri.trim(),
        user_prompt: queryText.trim(),
      };

      if (apiKey.trim()) {
        payload.llm_api_key = apiKey.trim();
        payload.gemini_api_key = apiKey.trim();
      }

      const res = await fetch("/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const durationMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        let errorMsg = "Query execution failed.";
        if (typeof data?.detail === "string") {
          errorMsg = data.detail;
        } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
          const msgs = data.detail.map((item: any) => {
            const m = item.msg || item.message || JSON.stringify(item);
            return m.replace(/^Value error,\s*/i, "");
          });
          errorMsg = msgs.join("; ");
        }

        if (errorMsg.toLowerCase().includes("api key")) {
          setShowSettings(true);
        }
        throw new Error(errorMsg);
      }

      setResult({
        ...data,
        durationMs,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during execution.");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-zinc-100 flex flex-col overflow-x-hidden">
      {/* Interactive Mouse Hover Spotlight & Grid Background */}
      <Background />

      {/* Top Bar */}
      <header className="border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-pixel text-xl tracking-wider text-zinc-100 font-semibold select-none">
              NL2SQL
            </h1>
            <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-500 border-l border-zinc-800 pl-3">
              Natural Language to SQL Engine
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors",
                showSettings
                  ? "border-zinc-700 bg-zinc-800/80 text-zinc-200"
                  : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200",
              ].join(" ")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Config</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Collapsible Config Section */}
        {showSettings && (
          <section className="rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur p-4 sm:p-5 transition-all">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="DATABASE CONNECTION URI"
                  value={dbUri}
                  onChange={(e) => handleDbUriChange(e.target.value)}
                  placeholder="sqlite:///sample.db"
                  rightAction={
                    <button
                      type="button"
                      onClick={() => handleDbUriChange("sqlite:///sample.db")}
                      className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
                      title="Use default sample database"
                    >
                      sample.db
                    </button>
                  }
                />
                <p className="mt-1.5 text-[10px] font-mono text-zinc-500">
                  SQLAlchemy URI (SQLite, MySQL, Postgres, etc.)
                </p>
              </div>

              <div>
                <Input
                  label="GEMINI / LLM API KEY"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Optional for sample.db, required for custom DB"
                  rightAction={
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5 transition-colors"
                      title={showApiKey ? "Hide Key" : "Show Key"}
                    >
                      {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  }
                />
                <p className="mt-1.5 text-[10px] font-mono text-zinc-500">
                  Optional if set via server environment variable
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Query Input Section */}
        <section className="flex flex-col gap-3">
          <Compose
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleExecute}
            isLoading={isLoading}
            placeholder="Ask a question about the database in plain English… (e.g. List top 5 highest spenders)"
          />

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mr-1 select-none">
              Examples:
            </span>
            {SAMPLE_QUERIES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(sample);
                }}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/20 bg-zinc-900/60 hover:bg-zinc-800/80 px-2.5 py-1 rounded-md transition-all text-left truncate max-w-full sm:max-w-md"
              >
                {sample}
              </button>
            ))}
          </div>
        </section>

        {/* Error Output */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs font-mono text-red-200 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-red-400 flex-none mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-red-300">Execution Error</div>
              <div className="text-red-300/80 break-words leading-relaxed">{error}</div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <section className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* SQL Query Viewer */}
            <SqlViewer
              sql={result.sql_query}
              rowCount={result.row_count}
              durationMs={result.durationMs}
            />

            {/* Tabular Data View */}
            <DataTable data={result.data} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-[11px] font-mono text-zinc-600">
        NL2SQL Engine · Schema Introspection & AST Verified Execution
      </footer>
    </div>
  );
}

export default App;
