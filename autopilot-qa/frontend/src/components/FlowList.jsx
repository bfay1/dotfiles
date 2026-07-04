export default function FlowList({ flows, loading, replayingId, onReplay }) {
  if (loading) {
    return <p className="text-gray-500 text-sm">Loading flows…</p>;
  }

  if (flows.length === 0) {
    return (
      <p className="text-gray-600 text-sm">
        No flows recorded yet. Use the form above to record your first flow.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-white">Saved Flows</h2>
      <ul className="space-y-2">
        {flows.map((flow) => (
          <li
            key={flow.id}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="text-white text-sm font-medium">{flow.name}</p>
              <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{flow.url}</p>
              <p className="text-gray-600 text-xs mt-0.5">
                {flow.steps?.length ?? 0} steps
              </p>
            </div>
            <button
              onClick={() => onReplay(flow.id)}
              disabled={replayingId === flow.id}
              className="ml-4 shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors"
            >
              {replayingId === flow.id ? "Replaying…" : "Replay"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
