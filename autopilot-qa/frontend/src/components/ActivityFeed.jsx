import { useEffect, useRef, useState } from "react";

// Map browser-use action names → display emoji
function actionEmoji(actionNames = [], isBacktrack = false) {
  if (isBacktrack) return "⚠️";
  const name = (actionNames[0] || "").toLowerCase();
  if (name.includes("click")) return "🖱️";
  if (name.includes("input") || name.includes("type")) return "⌨️";
  if (name.includes("scroll")) return "📜";
  if (name.includes("navigate") || name.includes("go_to")) return "🌐";
  if (name.includes("search")) return "🔍";
  if (name.includes("wait")) return "⏳";
  if (name.includes("screenshot")) return "📷";
  if (name.includes("done")) return "✅";
  if (name.includes("extract")) return "📋";
  return "🔍";
}

function formatEntry(event) {
  const { thought, action_names = [], is_backtrack, page_title } = event;
  const emoji = actionEmoji(action_names, is_backtrack);

  // Build a short human-readable line
  let text = thought || action_names.join(", ") || "Navigating…";
  // Truncate long thoughts to keep it tidy
  if (text.length > 120) text = text.slice(0, 117) + "…";

  return { emoji, text, page_title, is_backtrack };
}

function timestamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function ActivityFeed({ runId }) {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!runId) return;

    const es = new EventSource(`/api/run-persona-test/stream?run_id=${runId}`);

    es.addEventListener("step", (e) => {
      const event = JSON.parse(e.data);
      const entry = formatEntry(event);
      setLines((prev) => [...prev, { ...entry, ts: timestamp(), id: prev.length }]);
    });

    es.addEventListener("done", () => {
      setDone(true);
      es.close();
    });

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [runId]);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500">agent log</span>
        </div>
        {!done ? (
          <span className="flex items-center gap-1.5 text-xs text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            live
          </span>
        ) : (
          <span className="text-xs text-gray-600">done</span>
        )}
      </div>

      {/* Log lines */}
      <ul className="max-h-64 overflow-y-auto px-4 py-3 space-y-1.5 font-mono text-xs">
        {lines.length === 0 && !done && (
          <li className="text-gray-600 animate-pulse">Waiting for agent to start…</li>
        )}
        {lines.map((line) => (
          <li key={line.id} className="flex items-start gap-2">
            <span className="text-gray-700 shrink-0 select-none">{line.ts}</span>
            <span className="shrink-0">{line.emoji}</span>
            <span
              className={`leading-relaxed ${
                line.is_backtrack ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              {line.text}
            </span>
          </li>
        ))}
        <li ref={bottomRef} />
      </ul>

      {done && lines.length === 0 && (
        <p className="px-4 py-3 text-xs font-mono text-gray-600">No events received.</p>
      )}
    </div>
  );
}
