/*
# Add original_duration_ms column to events table

1. Modified Tables
- `events`
  - Add `original_duration_ms` (bigint, not null, default 0) — stores the original duration
    set at creation time, so that pause/resume operations can preserve it even when
    `duration_ms` is temporarily adjusted.

2. Backfill
- Set `original_duration_ms = duration_ms` for all existing rows.

3. Security
- No policy changes.
*/

ALTER TABLE events ADD COLUMN IF NOT EXISTS original_duration_ms BIGINT NOT NULL DEFAULT 0;

UPDATE events SET original_duration_ms = duration_ms WHERE original_duration_ms = 0;
