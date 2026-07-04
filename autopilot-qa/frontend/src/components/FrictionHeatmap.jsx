/**
 * FrictionHeatmap — vertical flow diagram showing friction points as
 * numbered callout circles connected by a gradient spine line.
 */
export default function FrictionHeatmap({ frictionPoints = [] }) {
  if (frictionPoints.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
        Friction Map
      </h3>

      <div className="relative pl-8">
        {/* Vertical spine */}
        <div
          className="absolute left-3 top-3 bottom-3 w-px"
          style={{
            background:
              "linear-gradient(to bottom, #6366f1 0%, #f97316 60%, #ef4444 100%)",
            opacity: 0.4,
          }}
        />

        <ol className="space-y-5">
          {frictionPoints.map((fp, i) => (
            <li key={i} className="relative flex items-start gap-4">
              {/* Callout circle */}
              <span
                className="absolute -left-5 flex items-center justify-center w-5 h-5 rounded-full text-white font-bold shrink-0"
                style={{
                  fontSize: "0.6rem",
                  background:
                    i < frictionPoints.length * 0.4
                      ? "#6366f1"   // indigo — early in flow
                      : i < frictionPoints.length * 0.75
                      ? "#f97316"   // orange — mid flow
                      : "#ef4444",  // red — late / abandonment zone
                }}
              >
                {i + 1}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0 bg-gray-900 border border-gray-800 rounded-md px-3.5 py-2.5">
                <p className="text-xs font-mono text-indigo-300 truncate">{fp.page}</p>
                <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">
                  {fp.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
