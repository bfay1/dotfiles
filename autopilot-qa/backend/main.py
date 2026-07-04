import asyncio
import json
import uuid
from typing import AsyncGenerator, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

import agent as agent_module
import analyzer
import supabase_client

load_dotenv()

app = FastAPI(title="AutopilotQA API")

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server and the Docker frontend service
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Docker frontend
        "http://frontend:3000",    # Docker internal network
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory SSE queue for streaming persona test actions
# ---------------------------------------------------------------------------
_sse_queues: dict[str, asyncio.Queue] = {}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class PersonaTestRequest(BaseModel):
    url: str
    goal: str
    persona: Literal["non_technical", "impatient", "international", "mobile"]
    # Client may pre-generate a run_id so it can open the SSE stream before
    # the POST returns.  If omitted the server generates one.
    run_id: str | None = None


class RecordFlowRequest(BaseModel):
    name: str
    url: str


# ---------------------------------------------------------------------------
# Persona Test
# ---------------------------------------------------------------------------

@app.post("/api/run-persona-test")
async def run_persona_test(req: PersonaTestRequest):
    run_id = req.run_id or str(uuid.uuid4())
    # setdefault: if the SSE consumer connected first, reuse that queue;
    # otherwise create a new one now.
    queue: asyncio.Queue = _sse_queues.setdefault(run_id, asyncio.Queue())

    async def step_callback(event: dict) -> None:
        await queue.put(event)

    try:
        run_result = await agent_module.run_persona_test(
            url=req.url,
            goal=req.goal,
            persona_name=req.persona,
            step_callback=step_callback,
        )
    finally:
        await queue.put(None)  # sentinel — closes any connected SSE stream
        _sse_queues.pop(run_id, None)

    report = analyzer.generate_friction_report(
        persona_name=req.persona,
        goal=req.goal,
        run_result=run_result,
    )

    # Attach run metadata to the report response
    report["run_id"] = run_id
    report["actions_log"] = run_result["actions_log"]
    report["pages_visited"] = run_result["pages_visited"]
    report["backtrack_count"] = run_result["backtrack_count"]

    return report


@app.get("/api/run-persona-test/stream")
async def stream_persona_test(run_id: str):
    """
    SSE stream of live step events for a running persona test.
    Each event has type "step" and carries the same dict that step_callback receives.
    A final "done" event is emitted when the run completes.
    """
    # setdefault: if the POST hasn't started yet, create the queue eagerly so
    # events are buffered until the consumer (this response) starts reading.
    queue = _sse_queues.setdefault(run_id, asyncio.Queue())

    async def event_generator() -> AsyncGenerator[dict, None]:
        while True:
            event = await queue.get()
            if event is None:
                break
            yield {"event": "step", "data": json.dumps(event)}
        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


# ---------------------------------------------------------------------------
# Flow Recording
# ---------------------------------------------------------------------------

@app.post("/api/record-flow")
async def record_flow(req: RecordFlowRequest):
    steps = await agent_module.record_flow(url=req.url, name=req.name)
    if not steps:
        raise HTTPException(
            status_code=422,
            detail=(
                "The agent completed its run but produced no recordable steps. "
                "Try a more specific flow name, e.g. 'sign up for an account' "
                "rather than 'onboarding'."
            ),
        )
    flow = supabase_client.create_flow(
        name=req.name,
        url=req.url,
        steps=steps,
    )
    return flow


# ---------------------------------------------------------------------------
# Flows
# ---------------------------------------------------------------------------

@app.get("/api/flows")
async def list_flows():
    return supabase_client.list_flows()


@app.get("/api/flows/{flow_id}")
async def get_flow(flow_id: str):
    flow = supabase_client.get_flow_with_last_run(flow_id)
    if flow is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    return flow


# ---------------------------------------------------------------------------
# Flow Replay
# ---------------------------------------------------------------------------

@app.post("/api/replay-flow/{flow_id}")
async def replay_flow(flow_id: str):
    flow = supabase_client.get_flow(flow_id)
    if flow is None:
        raise HTTPException(status_code=404, detail="Flow not found")

    steps_results = await agent_module.replay_flow(
        steps=flow["steps"],
        start_url=flow["url"],
    )

    overall_passed = bool(steps_results) and all(s["passed"] for s in steps_results)
    summary = analyzer.generate_flow_summary(
        steps_results,
        flow_name=flow.get("name", ""),
    )

    run = supabase_client.create_run(
        flow_id=flow_id,
        steps_results=steps_results,
        summary=summary,
        overall_passed=overall_passed,
    )

    return {
        "run_id": run["id"],
        "flow_id": flow_id,
        "flow_name": flow.get("name", ""),
        "overall_passed": overall_passed,
        "summary": summary,
        "steps_results": steps_results,
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}
