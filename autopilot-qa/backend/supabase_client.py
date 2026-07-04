import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_KEY"]
        _client = create_client(url, key)
    return _client


# --- Flows ---

def create_flow(name: str, url: str, steps: list[dict]) -> dict:
    client = get_client()
    result = client.table("flows").insert({
        "name": name,
        "url": url,
        "steps": steps,
    }).execute()
    return result.data[0]


def list_flows() -> list[dict]:
    client = get_client()
    result = client.table("flows").select("*").order("created_at", desc=True).execute()
    return result.data


def get_flow(flow_id: str) -> dict | None:
    try:
        client = get_client()
        result = client.table("flows").select("*").eq("id", flow_id).single().execute()
        return result.data
    except Exception:
        return None


def get_flow_with_last_run(flow_id: str) -> dict | None:
    flow = get_flow(flow_id)
    if flow is None:
        return None
    client = get_client()
    run_result = (
        client.table("runs")
        .select("*")
        .eq("flow_id", flow_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )
    flow["last_run"] = run_result.data[0] if run_result.data else None
    return flow


# --- Runs ---

def create_run(
    flow_id: str,
    steps_results: list[dict],
    summary: str,
    overall_passed: bool,
) -> dict:
    client = get_client()
    result = client.table("runs").insert({
        "flow_id": flow_id,
        "steps_results": steps_results,
        "summary": summary,
        "overall_passed": overall_passed,
    }).execute()
    return result.data[0]
