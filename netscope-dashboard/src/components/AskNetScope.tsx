"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownLite from "./MarkdownLite";

interface Turn {
  question: string;
  answer: string;
}

const SUGGESTIONS = [
  "Which country generates the most traffic?",
  "Are there any anomalies I should worry about?",
  "What's our error rate and which endpoint is worst?",
  "How much of our traffic looks like bots?",
];

const STORAGE_KEY = "netscope.ask.history";

function loadHistory(): Turn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(turns: Turn[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(turns));
  } catch {
    // storage unavailable (private mode, quota, etc.) — degrade silently
  }
}

export default function AskNetScope({
  initialQuestion,
}: {
  initialQuestion?: string;
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const firedInitial = useRef(false);

  useEffect(() => {
    setTurns(loadHistory());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveHistory(turns);
  }, [turns, hydrated]);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setQuestion("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setTurns((t) => [...t, { question: q, answer: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuestion && !firedInitial.current) {
      firedInitial.current = true;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface-1)", boxShadow: "var(--card-shadow)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Ask NetScope
        </div>
        {turns.length > 0 && (
          <button
            onClick={() => setTurns([])}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Clear history
          </button>
        )}
      </div>

      {turns.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full px-3 py-1 text-xs"
              style={{
                background: "var(--background)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-hairline)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex max-h-96 flex-col gap-3 overflow-y-auto">
        {turns.map((t, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div
              className="self-end max-w-[85%] rounded-2xl px-3 py-2 text-sm"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {t.question}
            </div>
            <div
              className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
              style={{ background: "var(--background)", color: "var(--text-primary)" }}
            >
              <MarkdownLite text={t.answer} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Thinking…
          </div>
        )}
        {error && (
          <div className="text-xs" style={{ color: "var(--status-critical)" }}>
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your traffic…"
          className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
          style={{
            background: "var(--background)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-hairline)",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
