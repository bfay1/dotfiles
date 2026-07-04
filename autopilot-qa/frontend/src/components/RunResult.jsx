export default function RunResult({ result }) {
  if (!result) return null;

  const { overall_passed, summary, steps_results = [], flow_name } = result;
  const passCount = steps_results.filter((s) => s.passed).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {flow_name && (
          <h3 className="text-sm font-semibold text-white">{flow_name}</h3>
        )}
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${
            overall_passed
              ? "bg-green-900/60 text-green-300 border border-green-800"
              : "bg-red-900/60 text-red-300 border border-red-800"
          }`}
        >
          {overall_passed ? "PASSED" : "FAILED"}
        </span>
        <span className="text-xs text-gray-500">
          {passCount}/{steps_results.length} steps passed
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
      )}

      {/* Step list */}
      {steps_results.length > 0 && (
        <ul className="space-y-1.5">
          {steps_results.map((step, i) => (
            <li
              key={i}
              className={`rounded-md border text-sm ${
                step.passed
                  ? "bg-green-950/40 border-green-900/60"
                  : "bg-red-950/40 border-red-900/60"
              }`}
            >
              <div className="flex items-start gap-3 px-3 py-2.5">
                {/* Step number */}
                <span className="shrink-0 text-xs font-mono text-gray-600 mt-0.5 w-5 text-right">
                  {i + 1}.
                </span>

                {/* Pass/fail icon */}
                <span
                  className={`shrink-0 font-bold text-base leading-none mt-px ${
                    step.passed ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {step.passed ? "✓" : "✗"}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`${step.passed ? "text-green-100" : "text-red-100"}`}>
                    {step.intent}
                  </p>
                  {!step.passed && step.failure_reason && (
                    <p className="text-xs text-red-400 mt-1 leading-relaxed">
                      {step.failure_reason}
                    </p>
                  )}
                  {step.screenshot_base64 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-400 transition-colors select-none">
                        Show screenshot
                      </summary>
                      <img
                        src={`data:image/png;base64,${step.screenshot_base64}`}
                        alt={`Step ${i + 1}: ${step.intent}`}
                        className="mt-2 rounded border border-gray-700 max-w-sm"
                      />
                    </details>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
