import { useState, useEffect, useRef } from "react";
import RunResult from "../components/RunResult.jsx";

// ---------------------------------------------------------------------------
// Record Flow Modal
// ---------------------------------------------------------------------------
function RecordModal({ onClose, onRecorded }) {
  const [form, setForm]       = useState({ name: "", url: "" });
  const [recording, setRecording] = useState(false);
  const [error, setError]     = useState(null);
  const nameRef               = useRef(null);

  // Trap focus and auto-focus name field on open
  useEffect(() => {
    nameRef.current?.focus();
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setRecording(true);
    setError(null);
    try {
      const res = await fetch("/api/record-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const flow = await res.json();
      onRecorded(flow);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecording(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Record New Flow</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Flow Name
            </label>
            <input
              ref={nameRef}
              type="text"
              required
              placeholder="user signup"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-600">
              Describe the flow in plain language — this becomes the agent's task.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Starting URL
            </label>
            <input
              type="url"
              required
              placeholder="https://example.com"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/50 border border-red-900 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recording}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              {recording && (
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {recording ? "Recording…" : "Start Recording"}
            </button>
          </div>
        </form>

        {recording && (
          <div className="px-5 pb-5 text-xs text-gray-500">
            The agent is navigating the flow. This takes 1–2 minutes.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Last-run status badge (shown in flow row)
// ---------------------------------------------------------------------------
function RunStatusBadge({ passed }) {
  if (passed === true)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Passed
      </span>
    );
  if (passed === false)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
      Not run
    </span>
  );
}

// ---------------------------------------------------------------------------
// Chevron icon
// ---------------------------------------------------------------------------
function Chevron({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function FlowMonitor() {
  const [flows, setFlows]             = useState([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [showModal, setShowModal]     = useState(false);

  // Expand state
  const [expandedId, setExpandedId]       = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null); // full flow with last_run
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Replay state
  const [replayingId, setReplayingId] = useState(null);
  const [latestRuns, setLatestRuns]   = useState({}); // { [flowId]: runResult }
  const [replayError, setReplayError] = useState(null);

  async function fetchFlows() {
    try {
      const res  = await fetch("/api/flows");
      const data = await res.json();
      setFlows(Array.isArray(data) ? data : []);
    } catch {
      /* keep stale list */
    } finally {
      setLoadingFlows(false);
    }
  }

  useEffect(() => { fetchFlows(); }, []);

  // Toggle expand / load full detail
  async function handleExpand(flowId) {
    if (expandedId === flowId) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(flowId);
    setExpandedDetail(null);
    setLoadingDetail(true);
    try {
      const res  = await fetch(`/api/flows/${flowId}`);
      const data = await res.json();
      setExpandedDetail(data);
    } catch {
      /* leave detail null */
    } finally {
      setLoadingDetail(false);
    }
  }

  // Replay a flow
  async function handleReplay(e, flowId) {
    e.stopPropagation(); // don't collapse the row
    setReplayingId(flowId);
    setReplayError(null);
    try {
      const res = await fetch(`/api/replay-flow/${flowId}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setLatestRuns((prev) => ({ ...prev, [flowId]: data }));
      // Auto-expand to show the fresh result
      setExpandedId(flowId);
      setExpandedDetail((prev) =>
        prev && prev.id === flowId ? { ...prev, last_run: data } : prev
      );
    } catch (err) {
      setReplayError(err.message);
    } finally {
      setReplayingId(null);
      fetchFlows();
    }
  }

  function handleRecorded(newFlow) {
    setShowModal(false);
    setFlows((prev) => [newFlow, ...prev]);
  }

  // For a given flow, decide which run result to show in the expanded panel.
  // Prefer the freshly-replayed result from this session; fall back to the
  // persisted last_run from the database.
  function getRunResult(flowId) {
    return latestRuns[flowId] ?? expandedDetail?.last_run ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Flow Monitor</h1>
          <p className="mt-1 text-gray-400 text-sm">
            Record a critical user journey once, then replay it after every deploy.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3.5 py-2 rounded-md transition-colors shrink-0"
        >
          <span className="text-lg leading-none">+</span>
          Record New Flow
        </button>
      </div>

      {/* Global replay error */}
      {replayError && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-md px-4 py-3 text-sm">
          {replayError}
        </div>
      )}

      {/* Flow list */}
      {loadingFlows ? (
        <p className="text-gray-500 text-sm py-8 text-center">Loading flows…</p>
      ) : flows.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-sm">No flows recorded yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm underline-offset-2 hover:underline transition-colors"
          >
            Record your first flow
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {flows.map((flow) => {
            const isExpanded  = expandedId === flow.id;
            const isReplaying = replayingId === flow.id;
            const runResult   = getRunResult(flow.id);
            // Derive last-run status: prefer cached session result, then nothing
            const lastPassed  = latestRuns[flow.id]?.overall_passed ?? undefined;

            return (
              <li key={flow.id} className="border border-gray-800 rounded-lg overflow-hidden">
                {/* ── Flow row ── */}
                <div
                  onClick={() => handleExpand(flow.id)}
                  className="flex items-center gap-4 px-4 py-3.5 bg-gray-900 cursor-pointer hover:bg-gray-800/60 transition-colors select-none"
                >
                  {/* Name + URL */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{flow.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{flow.url}</p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 shrink-0">
                    <RunStatusBadge passed={lastPassed} />
                    <span className="text-xs text-gray-600">
                      {flow.steps?.length ?? 0} step{flow.steps?.length !== 1 ? "s" : ""}
                    </span>

                    <button
                      onClick={(e) => handleReplay(e, flow.id)}
                      disabled={isReplaying || replayingId !== null}
                      className="text-xs font-medium px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 transition-colors"
                    >
                      {isReplaying ? "Running…" : "Run Now"}
                    </button>

                    <Chevron open={isExpanded} />
                  </div>
                </div>

                {/* ── Expanded detail panel ── */}
                {isExpanded && (
                  <div className="border-t border-gray-800 bg-gray-950 px-4 py-5">
                    {isReplaying ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Replaying flow steps…
                      </div>
                    ) : loadingDetail && !runResult ? (
                      <p className="text-sm text-gray-500 py-4">Loading last run…</p>
                    ) : runResult ? (
                      <RunResult result={runResult} />
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-sm text-gray-500">No runs yet for this flow.</p>
                        <button
                          onClick={(e) => handleReplay(e, flow.id)}
                          disabled={replayingId !== null}
                          className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm underline-offset-2 hover:underline transition-colors"
                        >
                          Run it now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Record modal */}
      {showModal && (
        <RecordModal
          onClose={() => setShowModal(false)}
          onRecorded={handleRecorded}
        />
      )}
    </div>
  );
}
