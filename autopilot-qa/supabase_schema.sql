-- Run this in the Supabase SQL editor to set up the required tables.

create table if not exists flows (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  url         text not null,
  steps       jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

create table if not exists runs (
  id             uuid primary key default gen_random_uuid(),
  flow_id        uuid not null references flows(id) on delete cascade,
  timestamp      timestamptz not null default now(),
  steps_results  jsonb not null default '[]',
  summary        text not null default '',
  overall_passed boolean not null default false
);

-- Index for fetching runs by flow, newest first
create index if not exists runs_flow_id_timestamp_idx
  on runs(flow_id, timestamp desc);
