import FrictionHeatmap from "./FrictionHeatmap.jsx";

const RISK_STYLES = {
  low:    { badge: "bg-green-900/60 text-green-300 border border-green-700",  dot: "bg-green-400" },
  medium: { badge: "bg-yellow-900/60 text-yellow-300 border border-yellow-700", dot: "bg-yellow-400" },
  high:   { badge: "bg-red-900/60 text-red-300 border border-red-700",      dot: "bg-red-400" },
};

const PERSONA_LABELS = {
  non_technical: "Non-technical",
  impatient:     "Impatient",
  international: "International",
  mobile:        "Mobile",
};

function RiskBadge({ risk }) {
  const style = RISK_STYLES[risk] ?? RISK_STYLES.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {risk?.charAt(0).toUpperCase() + risk?.slice(1)} abandonment risk
    </span>
  );
}

export default function FrictionReport({ report, persona }) {
  const { completed, abandonment_risk, friction_points = [], summary, actions_log = [] } = report;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          Friction Report
          {persona && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              — {PERSONA_LABELS[persona] ?? persona} persona
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              completed ? "bg-green-900/60 text-green-300" : "bg-red-900/60 text-red-300"
            }`}
          >
            {completed ? "COMPLETED" : "ABANDONED"}
          </span>
          <RiskBadge risk={abandonment_risk} />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
      </div>

      {/* Friction heatmap */}
      {friction_points.length > 0 ? (
        <FrictionHeatmap frictionPoints={friction_points} />
      ) : (
        <p className="text-sm text-gray-500">No friction points identified.</p>
      )}

      {/* Raw action log (collapsed) */}
      {actions_log.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-400 transition-colors select-none">
            Show raw action log ({actions_log.length} steps)
          </summary>
          <ol className="mt-3 space-y-1 pl-2 border-l-2 border-gray-800 max-h-52 overflow-y-auto">
            {actions_log.map((entry, i) => (
              <li key={i} className="text-xs text-gray-500 font-mono pl-3">
                <span className="text-gray-700 mr-2 select-none">{i + 1}.</span>
                {entry}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
