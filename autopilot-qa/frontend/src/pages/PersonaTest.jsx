import { useState } from "react";
import FrictionReport from "../components/FrictionReport.jsx";
import ActivityFeed from "../components/ActivityFeed.jsx";

const PERSONAS = [
  { value: "non_technical", label: "Non-technical — reads carefully, confused by jargon" },
  { value: "impatient",     label: "Impatient — skips reading, gives up quickly" },
  { value: "international", label: "International — unfamiliar with US-centric patterns" },
  { value: "mobile",        label: "Mobile — thumb-first, frustrated by small targets" },
];

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function PersonaTest() {
  const [url, setUrl]       = useState("");
  const [goal, setGoal]     = useState("");
  const [persona, setPersona] = useState("non_technical");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [runId, setRunId]     = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    // Pre-generate run_id so the SSE stream can open before the POST completes.
    const id = crypto.randomUUID();
    setRunId(id);

    try {
      const res = await fetch("/api/run-persona-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, goal, persona, run_id: id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Persona Test</h1>
        <p className="mt-1 text-gray-400 text-sm">
          Run a browser agent as a specific user persona and receive a UX friction report.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            URL
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Goal
          </label>
          <input
            type="text"
            required
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Sign up for a free trial"
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Persona
          </label>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {PERSONAS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors"
        >
          {loading && <Spinner />}
          {loading ? "Running agent…" : "Run Persona Test"}
        </button>
      </form>

      {/* Live activity feed — shown while agent is running */}
      {loading && runId && (
        <div className="max-w-2xl space-y-3">
          <p className="text-sm text-gray-400">
            The browser agent is navigating the site as a{" "}
            <span className="text-indigo-400 font-medium">
              {PERSONAS.find((p) => p.value === persona)?.label.split(" — ")[0].toLowerCase()}
            </span>{" "}
            user. This takes 1–3 minutes.
          </p>
          <ActivityFeed runId={runId} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl bg-red-950 border border-red-800 text-red-300 rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && <FrictionReport report={result} persona={persona} />}
    </div>
  );
}
