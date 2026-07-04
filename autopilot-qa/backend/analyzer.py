"""
Claude-powered report generation.
Always called after a browser agent run completes — never inline during navigation.
"""

import json
import os

import anthropic
from dotenv import load_dotenv

load_dotenv()

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


# ---------------------------------------------------------------------------
# Persona friction report
# ---------------------------------------------------------------------------

FRICTION_REPORT_SYSTEM = """\
You are a senior UX researcher analyzing a structured session recording from a simulated user test.

You will receive:
- The persona type and their specific behavioral traits
- The goal the user was trying to accomplish
- Whether the goal was achieved
- Every page visited (URL + title)
- Every step taken, including backtracking events and what the agent was thinking
- The number of backtracking events (a strong signal of confusion)

Your job:
1. Identify concrete, specific UX friction points. For each one, name the page or section and
   describe exactly what caused friction for THIS persona — not a generic user.
2. Assess abandonment risk based on how much the persona struggled, how many pages they visited,
   and how many times they backtracked.
3. Write a summary from the persona's point of view.

Rules:
- If abandonment_risk is "medium" or "high", friction_points MUST be non-empty.
- Each friction_point description must be specific and actionable — "confusing navigation" is too
  vague; "the Pricing link is hidden in the footer and not visible without scrolling" is correct.
- The summary must reference the persona type, the goal, and the outcome.
- Do not output anything except the JSON object.

Respond with valid JSON in exactly this shape:
{
  "completed": <true if the goal was fully achieved, otherwise false>,
  "abandonment_risk": "<low|medium|high>",
  "friction_points": [
    { "page": "<page name or URL path>", "description": "<specific friction for this persona>" }
  ],
  "summary": "<2-4 sentences from the persona's perspective>"
}
"""


def generate_friction_report(
    persona_name: str,
    goal: str,
    run_result: dict,
) -> dict:
    """
    Given a persona name, the user's goal, and the structured RunResult from agent.py,
    call Claude claude-sonnet-4-6 and return a parsed friction report dict.
    """
    client = _get_client()

    goal_achieved = run_result.get("goal_achieved", False)
    backtrack_count = run_result.get("backtrack_count", 0)
    pages_visited = run_result.get("pages_visited", [])
    actions = run_result.get("actions", [])
    final_result = run_result.get("final_result")

    # --- build the user message ---

    pages_text = "\n".join(
        f"  {i+1}. {p.get('title') or '(no title)'} — {p.get('url', '')}"
        for i, p in enumerate(pages_visited)
    ) or "  (none recorded)"

    steps_lines: list[str] = []
    for a in actions:
        prefix = f"  Step {a['step']:>2}"
        if a.get("is_backtrack"):
            prefix += " [BACKTRACK]"
        page = a.get("page_title") or a.get("page_url") or "unknown page"
        thought = a.get("thought") or "(no narration)"
        act_names = ", ".join(a.get("action_names", [])) or "—"
        steps_lines.append(f"{prefix} on '{page}'")
        steps_lines.append(f"           actions: {act_names}")
        steps_lines.append(f"           thought: {thought}")
    actions_text = "\n".join(steps_lines) or "  (none recorded)"

    user_message = (
        f"Persona: {persona_name}\n"
        f"Goal: {goal}\n"
        f"Goal achieved: {'YES' if goal_achieved else 'NO'}\n"
        f"Total pages visited: {len(pages_visited)}\n"
        f"Backtracking events: {backtrack_count}\n"
        f"\nPages visited (in order):\n{pages_text}\n"
        f"\nStep-by-step actions:\n{actions_text}\n"
    )
    if final_result:
        user_message += f"\nAgent's final statement: {final_result}\n"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=FRICTION_REPORT_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()

    # Strip markdown code fences if Claude added them
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw.strip())


# ---------------------------------------------------------------------------
# Flow replay summary
# ---------------------------------------------------------------------------

FLOW_SUMMARY_SYSTEM = """\
You are a QA engineer writing a plain-English run report for a non-technical stakeholder.

You will receive:
- The name of a recorded user flow
- The pass/fail outcome for each step, plus the failure reason for any step that failed

Write a summary of 3-5 sentences that:
1. Opens with a clear overall verdict (e.g. "The 'user signup' flow passed all 5 steps" or
   "The 'checkout' flow failed at step 3 of 5").
2. For each failed step, quotes its failure reason verbatim and states which step number it was.
3. Identifies the most likely root cause if one can be reasonably inferred from the failure
   reasons (e.g. "the Sign Up button appears to have been renamed", "the page now redirects to
   a login screen before allowing checkout").
4. Uses plain English with no jargon — suitable for a product manager or designer to read.

Do not pad with generic filler like "overall the experience was smooth" for steps that passed.
Focus entirely on what happened, what broke, and why.
"""


def generate_flow_summary(steps_results: list[dict], flow_name: str = "") -> str:
    client = _get_client()

    pass_count = sum(1 for s in steps_results if s["passed"])
    total = len(steps_results)

    header = f"Flow: {flow_name}\n" if flow_name else ""
    header += f"Result: {pass_count}/{total} steps passed\n\n"

    lines: list[str] = []
    for i, s in enumerate(steps_results, start=1):
        status = "PASS" if s["passed"] else "FAIL"
        line = f"Step {i} [{status}]: {s['intent']}"
        if not s["passed"] and s.get("failure_reason"):
            line += f"\n  Failure reason: {s['failure_reason']}"
        lines.append(line)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=384,
        system=FLOW_SUMMARY_SYSTEM,
        messages=[{"role": "user", "content": header + "\n".join(lines)}],
    )

    return response.content[0].text.strip()
