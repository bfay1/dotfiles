"""
Browser-use agent orchestration.

run_persona_test returns a structured RunResult dict:
{
    "goal_achieved":   bool,
    "pages_visited":   [{"url": str, "title": str}],          # ordered, deduplicated
    "actions":         [{"step": int, "page_url": str, "page_title": str,
                         "thought": str, "action_names": [str], "is_backtrack": bool}],
    "backtrack_count": int,
    "final_result":    str | None,
    "actions_log":     [str],   # flat list of thoughts (for analyzer)
}
"""

import os
from typing import Callable, Awaitable

from dotenv import load_dotenv
from browser_use import Agent, Browser, BrowserConfig
from langchain_anthropic import ChatAnthropic

from personas import PERSONAS

load_dotenv()

StepCallback = Callable[[dict], Awaitable[None]]


# ---------------------------------------------------------------------------
# Browser / LLM factories
# ---------------------------------------------------------------------------

def _make_browser() -> Browser:
    headless = os.environ.get("PLAYWRIGHT_HEADLESS", "true").lower() == "true"
    return Browser(config=BrowserConfig(headless=headless))


def _make_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model="claude-sonnet-4-6",
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
    )


# ---------------------------------------------------------------------------
# History extraction helpers
# ---------------------------------------------------------------------------

def _step_thought(step) -> str:
    """
    Pull the most useful narration text from a history step.
    Handles both older APIs that expose `thought` and newer ones that use
    evaluation_previous_goal / next_goal.
    """
    try:
        brain = step.model_output.current_state
        for attr in ("thought", "next_goal", "evaluation_previous_goal", "memory"):
            val = getattr(brain, attr, None)
            if val and str(val).strip():
                return str(val).strip()
    except Exception:
        pass
    return ""


def _step_action_names(step) -> list[str]:
    """Return the list of action type names executed in a step (e.g. 'click_element', 'done')."""
    names: list[str] = []
    try:
        for action in step.model_output.action or []:
            try:
                dumped = action.model_dump(exclude_none=True)
                names.extend(dumped.keys())
            except Exception:
                pass
    except Exception:
        pass
    return names


def _step_url_title(step) -> tuple[str, str]:
    try:
        return step.state.url or "", step.state.title or ""
    except Exception:
        return "", ""


def _process_history(history) -> dict:
    """
    Convert an AgentHistoryList into the structured RunResult dict.
    All attribute accesses are guarded so version differences don't crash us.
    """
    # --- goal achieved ---
    goal_achieved = False
    try:
        goal_achieved = bool(history.is_done())
    except Exception:
        # Fallback: a "done" action in the log means the agent declared itself finished.
        for step in history.history or []:
            if "done" in _step_action_names(step):
                goal_achieved = True
                break

    # --- final result text ---
    final_result: str | None = None
    try:
        final_result = history.final_result()
    except Exception:
        pass

    # --- per-step extraction ---
    seen_urls: list[str] = []   # ordered sequence for backtrack detection
    pages_map: dict[str, str] = {}  # url -> title (insertion-ordered)
    actions_list: list[dict] = []
    actions_log: list[str] = []

    for i, step in enumerate(history.history or []):
        url, title = _step_url_title(step)
        thought = _step_thought(step)
        action_names = _step_action_names(step)

        # Register page
        if url and url not in pages_map:
            pages_map[url] = title

        # Backtrack = we've been to this URL before in this session
        is_backtrack = bool(url and url in seen_urls)
        if url:
            seen_urls.append(url)

        if thought:
            actions_log.append(thought)

        actions_list.append({
            "step": i + 1,
            "page_url": url,
            "page_title": title,
            "thought": thought,
            "action_names": action_names,
            "is_backtrack": is_backtrack,
        })

    pages_visited = [{"url": u, "title": t} for u, t in pages_map.items()]
    backtrack_count = sum(1 for a in actions_list if a["is_backtrack"])

    return {
        "goal_achieved": goal_achieved,
        "pages_visited": pages_visited,
        "actions": actions_list,
        "backtrack_count": backtrack_count,
        "final_result": final_result,
        "actions_log": actions_log,
    }


# ---------------------------------------------------------------------------
# Persona Test
# ---------------------------------------------------------------------------

async def run_persona_test(
    url: str,
    goal: str,
    persona_name: str,
    step_callback: StepCallback | None = None,
) -> dict:
    """
    Run the browser agent as the given persona toward `goal` starting at `url`.

    Returns a RunResult dict (see module docstring).
    If `step_callback` is provided it is awaited after each agent step with a
    dict of { step, page_url, page_title, thought, action_names, is_backtrack }.
    """
    persona_prompt = PERSONAS.get(persona_name, "")

    task = (
        f"{persona_prompt}\n"
        f"---\n"
        f"Go to: {url}\n"
        f"Your goal: {goal}\n\n"
        f"Stay in character as the persona described above at every step.\n"
        f"Think out loud: narrate what you see, what you understand or don't, "
        f"what frustrates you, what you decide to click, and whether you feel "
        f"like giving up at any point."
    )

    # Sequence of URLs seen so far — used to detect backtracking inside the
    # step callback (the post-run _process_history also does this, but we need
    # it here so the live callback carries the flag correctly).
    _callback_seen_urls: list[str] = []

    browser = _make_browser()

    class _PersonaAgent(Agent):
        """Thin subclass that fires step_callback after each agent step."""

        async def step(self, *args, **kwargs):
            result = await super().step(*args, **kwargs)

            if step_callback is None:
                return result

            try:
                # browser-use stores history on self._history or self.history
                history_obj = getattr(self, "_history", None) or getattr(self, "history", None)
                if not (history_obj and history_obj.history):
                    return result

                latest = history_obj.history[-1]
                page_url, page_title = _step_url_title(latest)
                thought = _step_thought(latest)
                action_names = _step_action_names(latest)

                is_backtrack = bool(page_url and page_url in _callback_seen_urls)
                if page_url:
                    _callback_seen_urls.append(page_url)

                await step_callback({
                    "step": len(history_obj.history),
                    "page_url": page_url,
                    "page_title": page_title,
                    "thought": thought,
                    "action_names": action_names,
                    "is_backtrack": is_backtrack,
                })
            except Exception:
                # Never let a callback error abort the agent run.
                pass

            return result

    agent = _PersonaAgent(
        task=task,
        llm=_make_llm(),
        browser=browser,
        max_actions_per_step=5,
    )

    try:
        history = await agent.run(max_steps=20)
    finally:
        await browser.close()

    return _process_history(history)


# ---------------------------------------------------------------------------
# Flow Recording — helpers
# ---------------------------------------------------------------------------

# Actions that carry no user-visible intent worth recording.
_SKIP_ACTIONS = frozenset({
    "scroll_down", "scroll_up", "scroll_to_text",
    "wait", "screenshot", "noop", "extract_page_content",
})


def _lookup_element_label(step, index: int | None) -> str:
    """
    Return the best human-readable label for an interactable element.

    browser-use assigns a `highlight_index` to each interactable element
    during DOM parsing; that index is what click_element / input_text actions
    reference.  We walk the list to find it, then pull the most meaningful
    text attribute available.
    """
    if index is None:
        return "element"
    try:
        elements = getattr(step.state, "interactable_elements", None) or []
        el = None
        # Primary: match by highlight_index
        for e in elements:
            if getattr(e, "highlight_index", None) == index:
                el = e
                break
        # Fallback: positional index
        if el is None and 0 <= index < len(elements):
            el = elements[index]
        if el is None:
            return f"element #{index}"

        attrs: dict = getattr(el, "attributes", {}) or {}
        for attr in ("aria-label", "placeholder", "name", "title", "alt", "value"):
            val = attrs.get(attr, "").strip()
            if val:
                return val

        tag = getattr(el, "tag_name", "") or "element"
        return tag
    except Exception:
        return f"element #{index}"


def _describe_action(
    action_type: str,
    params: dict,
    step,
    fallback_thought: str,
) -> tuple[str, str]:
    """
    Convert one browser-use action into (intent, element_description).
    Returns ("", "") for actions that should be skipped.
    """
    if action_type in _SKIP_ACTIONS:
        return "", ""

    if action_type == "go_to_url":
        target = params.get("url", "")
        return f"Navigate to {target}", "browser address bar"

    if action_type == "click_element":
        index = params.get("index")
        label = _lookup_element_label(step, index)
        return f"Click '{label}'", label

    if action_type == "input_text":
        index = params.get("index")
        text = params.get("text", "")
        label = _lookup_element_label(step, index)
        return f"Enter '{text}' into {label}", label

    if action_type == "select_option":
        index = params.get("index")
        option = params.get("option", "")
        label = _lookup_element_label(step, index)
        return f"Select '{option}' from {label}", label

    if action_type in ("send_keys", "press_key"):
        key = params.get("key", "")
        return f"Press {key}", "keyboard"

    if action_type == "done":
        text = params.get("text", "")
        return text or "Complete the flow", ""

    # Generic fallback — use the agent's thought as intent
    return fallback_thought or action_type, ""


def _extract_flow_steps(history) -> list[dict]:
    """
    Walk an AgentHistoryList and produce a list of intent-level steps.
    Each step: { intent: str, url: str, element_description: str }

    Skips scroll/wait/screenshot actions and deduplicates identical
    (intent, url) pairs that may appear in consecutive steps.
    """
    steps: list[dict] = []
    seen: set[tuple[str, str]] = set()  # (intent, url) dedup

    for step in history.history or []:
        url = ""
        try:
            url = step.state.url or ""
        except Exception:
            pass

        thought = _step_thought(step)

        try:
            actions = step.model_output.action or []
        except Exception:
            actions = []

        for action in actions:
            try:
                action_dict = action.model_dump(exclude_none=True)
            except Exception:
                continue
            if not action_dict:
                continue

            action_type = next(iter(action_dict))
            params = action_dict[action_type] or {}

            intent, element_desc = _describe_action(action_type, params, step, thought)
            if not intent:
                continue

            key = (intent, url)
            if key in seen:
                continue
            seen.add(key)

            steps.append({
                "intent": intent,
                "url": url,
                "element_description": element_desc,
            })

    return steps


# ---------------------------------------------------------------------------
# Flow Recording — public entry point
# ---------------------------------------------------------------------------

async def record_flow(url: str, name: str) -> list[dict]:
    """
    Launch a browser agent that demonstrates how to accomplish *name* starting
    at *url*, then extract the journey as intent-level steps.

    Steps are derived from the actual browser-use action history — not from
    parsing the agent's thoughts — so the output is always structured and
    never selector-based.

    Each step: { intent: str, url: str, element_description: str }
    """
    task = (
        f"You are a knowledgeable user demonstrating how to: {name}\n"
        f"Start at {url} and complete this task the way a typical user would.\n\n"
        f"Use realistic placeholder data wherever input is required:\n"
        f"  Email:    test@example.com\n"
        f"  Password: TestPassword123!\n"
        f"  Name:     Alex Johnson\n"
        f"  Phone:    555-0100\n\n"
        f"Complete as many steps of '{name}' as possible. Think clearly about "
        f"what you are doing and why at each step."
    )

    browser = _make_browser()
    agent = Agent(
        task=task,
        llm=_make_llm(),
        browser=browser,
        max_actions_per_step=3,  # keep steps granular for cleaner recording
    )

    try:
        history = await agent.run(max_steps=25)
    finally:
        await browser.close()

    return _extract_flow_steps(history)


# ---------------------------------------------------------------------------
# Flow Replay
# ---------------------------------------------------------------------------

def _parse_step_result(history) -> tuple[bool, str | None]:
    """
    Determine pass/fail from an AgentHistoryList.

    Primary signal: the `done` action's `success` field.  browser-use always
    ends an agent run with a `done` action and the model sets success explicitly.

    Secondary: scan the final thought for unambiguous failure language.
    """
    # Primary — walk history in reverse, find the done action
    for step in reversed(history.history or []):
        try:
            for action in step.model_output.action or []:
                action_dict = action.model_dump(exclude_none=True)
                if "done" not in action_dict:
                    continue
                done_params = action_dict["done"] or {}
                success = done_params.get("success", True)
                text = (done_params.get("text") or "").strip()
                if not success:
                    # Strip a leading "Failed:" prefix so we store the clean reason
                    reason = text.split(":", 1)[-1].strip() if ":" in text else text
                    return False, reason or "Agent reported failure"
                return True, None
        except Exception:
            pass

    # Secondary — look for failure keywords in the last meaningful thought
    _FAILURE_WORDS = ("failed", "cannot", "unable", "not found", "could not", "doesn't exist", "error")
    for step in reversed(history.history or []):
        thought = _step_thought(step)
        if not thought:
            continue
        if any(w in thought.lower() for w in _FAILURE_WORDS):
            return False, thought
        return True, None  # first meaningful thought with no failure signal → pass

    # No signal at all (empty run) — treat as inconclusive pass
    return True, None


async def replay_flow(steps: list[dict], start_url: str) -> list[dict]:
    """
    Replay a recorded flow step by step.

    All step-agents share a single BrowserContext so that navigation state,
    cookies, and form data carry over from one step to the next — which is
    the only way step N can find elements that only exist after step N-1.

    Returns: [{ intent, passed, screenshot_base64, failure_reason }]
    """
    import base64

    steps_results: list[dict] = []
    browser = _make_browser()

    try:
        # One shared context for the whole replay session.
        context = await browser.new_context()

        # Navigate to the start URL before handing control to step agents.
        try:
            start_page = await context.get_current_page()
            await start_page.goto(start_url, wait_until="domcontentloaded", timeout=30_000)
        except Exception:
            pass  # agent will handle navigation errors on the first step

        for step in steps:
            intent = step.get("intent", "")
            element_desc = step.get("element_description", "")

            task = (
                f"Your sole task is to perform this one action on the current page:\n"
                f"  Action: {intent}\n"
                f"  Target element: {element_desc}\n\n"
                f"When you are done — whether you succeeded or not — call the `done` action.\n"
                f"  • Set success=True if you completed the action.\n"
                f"  • Set success=False and write a brief plain-English explanation in the "
                f"`text` field if the element was not found or the action could not be "
                f"completed (e.g. 'The Sign Up button is no longer on this page').\n"
                f"Do not navigate to a different page unless the action itself requires it."
            )

            step_agent = Agent(
                task=task,
                llm=_make_llm(),
                browser_context=context,   # share state with previous steps
                max_actions_per_step=3,
            )

            passed = False
            failure_reason: str | None = None
            screenshot_b64: str | None = None

            try:
                history = await step_agent.run(max_steps=6)
                passed, failure_reason = _parse_step_result(history)
            except Exception as exc:
                failure_reason = str(exc)

            # Capture the page state immediately after this step attempt.
            try:
                page = await context.get_current_page()
                raw = await page.screenshot(type="png", full_page=False)
                screenshot_b64 = base64.b64encode(raw).decode()
            except Exception:
                screenshot_b64 = None

            steps_results.append({
                "intent": intent,
                "passed": passed,
                "screenshot_base64": screenshot_b64,
                "failure_reason": failure_reason,
            })

    finally:
        await browser.close()

    return steps_results
