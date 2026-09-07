/*
# Create events table for Event Ping Discord bot

1. New Tables
- `events`
  - `id` (serial, primary key) — unique numeric event identifier used in slash commands
  - `guild_id` (text, not null) — Discord guild (server) ID the event belongs to
  - `name` (text, not null) — display name of the event
  - `duration_ms` (bigint, not null) — duration in milliseconds before the next trigger
  - `duration_text` (text, not null) — original human-readable duration string (e.g. "1h30m")
  - `channel_id` (text, not null) — Discord channel ID where the event is announced
  - `role_id` (text, not null) — Discord role ID to ping
  - `message` (text, not null) — message content sent when the timer fires
  - `repeat` (boolean, not null, default false) — whether the event auto-repeats
  - `status` (text, not null, default 'active') — one of: 'active', 'paused', 'cancelled', 'deleted'
  - `next_trigger_at` (timestamptz, not null) — when the timer should next fire
  - `last_triggered_at` (timestamptz) — when the timer last fired (nullable)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Indexes
- Index on `guild_id` for listing events per server
- Index on `status` for filtering active events
- Index on `next_trigger_at` for scheduler queries

3. Security
- Enable RLS on `events`.
- The bot runs server-side with the service-role key, but we add open anon/authenticated policies
  because this is a bot backend (no sign-in screen) — the service-role key bypasses RLS anyway.
*/

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_ms BIGINT NOT NULL,
  duration_text TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  message TEXT NOT NULL,
  repeat BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  next_trigger_at TIMESTAMPTZ NOT NULL,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_guild_id ON events (guild_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_next_trigger ON events (next_trigger_at);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);
