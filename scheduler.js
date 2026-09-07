import { supabase } from './db.js';
import { updateEvent, getEvent } from './events.js';

/**
 * @typedef {import('discord.js').Client} DiscordClient
 */

/** @type {DiscordClient|null} */
let client = null;

/** Map of event ID -> current timeout handle (in-memory scheduling). */
const timers = new Map();

/**
 * Set the Discord client reference (called at bot startup).
 * @param {DiscordClient} c
 */
export function setClient(c) {
  client = c;
}

/**
 * Send the event trigger message to the configured channel with a role ping.
 * @param {EventRow} event
 */
async function fireEvent(event) {
  if (!client) {
    console.error('[Scheduler] No Discord client set — cannot fire event.');
    return;
  }

  try {
    const channel = await client.channels.fetch(event.channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(
        `[Scheduler] Channel ${event.channel_id} not found or not text-based for event "${event.name}".`
      );
      return;
    }

    const content = `🔔 **${event.name}**\n\n${event.message}\n\n<@&${event.role_id}>`;
    await channel.send({ content, allowedMentions: { roles: [event.role_id] } });

    console.log(`[Scheduler] Fired event "${event.name}" (#${event.id}) in channel ${event.channel_id}`);
  } catch (err) {
    console.error(`[Scheduler] Error firing event "${event.name}" (#${event.id}):`, err);
  }
}

/**
 * Schedule the next trigger for an event using setTimeout.
 * If the trigger time has already passed, fire immediately (and catch up for repeats).
 * @param {EventRow} event
 * @param {boolean} [fireIfPast=true] — whether to fire immediately if the trigger is in the past.
 */
export function scheduleEvent(event, fireIfPast = true) {
  // Cancel any existing timer for this event
  cancelTimer(event.id);

  if (event.status !== 'active') return;

  const triggerTime = new Date(event.next_trigger_at).getTime();
  const now = Date.now();
  const delay = triggerTime - now;

  if (delay <= 0) {
    if (fireIfPast) {
      // The trigger time has passed — fire now
      handleTrigger(event);
    }
    return;
  }

  // Cap setTimeout to ~2^31 - 1 ms (max safe value) — ~24.8 days
  const safeDelay = Math.min(delay, 2147483647);

  const handle = setTimeout(() => {
    handleTrigger(event);
  }, safeDelay);

  timers.set(event.id, handle);
  console.log(
    `[Scheduler] Scheduled event "${event.name}" (#${event.id}) to fire in ${Math.round(delay / 1000)}s`
  );
}

/**
 * Handle a trigger: fire the message, then reschedule if repeating.
 * @param {EventRow} event
 */
async function handleTrigger(event) {
  timers.delete(event.id);

  // Re-fetch the latest state from the DB in case it was edited/paused/deleted
  const fresh = await getEvent(event.id, event.guild_id);
  if (!fresh || fresh.status !== 'active') {
    console.log(`[Scheduler] Event #${event.id} is no longer active — skipping trigger.`);
    return;
  }

  await fireEvent(fresh);

  const now = new Date();
  const updates = { last_triggered_at: now.toISOString() };

  if (fresh.repeat) {
    // Schedule the next trigger from now
    const nextTrigger = new Date(now.getTime() + fresh.duration_ms);
    updates.next_trigger_at = nextTrigger.toISOString();
  } else {
    // Non-repeating event — mark as cancelled (done)
    updates.status = 'cancelled';
  }

  const updated = await updateEvent(fresh.id, fresh.guild_id, updates);

  if (updated && updated.status === 'active') {
    scheduleEvent(updated);
  }
}

/**
 * Cancel the in-memory timer for an event (does not change DB status).
 * @param {number} eventId
 */
export function cancelTimer(eventId) {
  const handle = timers.get(eventId);
  if (handle) {
    clearTimeout(handle);
    timers.delete(eventId);
  }
}

/**
 * Reschedule an event from the database (used after edits, restart, resume).
 * @param {number} eventId
 * @param {string} guildId
 */
export async function rescheduleEvent(eventId, guildId) {
  cancelTimer(eventId);
  const event = await getEvent(eventId, guildId);
  if (event && event.status === 'active') {
    scheduleEvent(event);
  }
  return event;
}

/**
 * On bot startup: recover all active events and schedule them.
 * Events whose trigger time has passed will fire immediately, with catch-up logic
 * for repeating events (advance to the next future trigger without spamming).
 */
export async function recoverAllEvents() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('[Scheduler] Error recovering events:', error.message);
    return;
  }

  if (!events || events.length === 0) {
    console.log('[Scheduler] No active events to recover.');
    return;
  }

  console.log(`[Scheduler] Recovering ${events.length} active event(s)...`);

  for (const event of events) {
    const triggerTime = new Date(event.next_trigger_at).getTime();
    const now = Date.now();

    if (triggerTime <= now) {
      // The trigger time has passed while the bot was down
      if (event.repeat) {
        // Advance the trigger time forward in steps until it's in the future
        let next = triggerTime;
        while (next <= now) {
          next += event.duration_ms;
        }
        const nextDate = new Date(next);
        await updateEvent(event.id, event.guild_id, {
          next_trigger_at: nextDate.toISOString(),
        });
        const updated = { ...event, next_trigger_at: nextDate.toISOString() };
        scheduleEvent(updated, false);
        console.log(
          `[Scheduler] Recovered repeating event "${event.name}" (#${event.id}) — next trigger advanced to ${nextDate.toISOString()}`
        );
      } else {
        // Non-repeating event that missed its trigger — fire it now, then mark cancelled
        await fireEvent(event);
        await updateEvent(event.id, event.guild_id, {
          last_triggered_at: new Date().toISOString(),
          status: 'cancelled',
        });
        console.log(
          `[Scheduler] Recovered one-shot event "${event.name}" (#${event.id}) — fired missed trigger.`
        );
      }
    } else {
      // Trigger is still in the future — schedule normally
      scheduleEvent(event, false);
      console.log(
        `[Scheduler] Recovered event "${event.name}" (#${event.id}) — next trigger in ${Math.round((triggerTime - now) / 1000)}s`
      );
    }
  }

  console.log('[Scheduler] Recovery complete.');
}

/**
 * Immediately fire an event's message and reschedule if repeating.
 * Used by the /event trigger command.
 * @param {EventRow} event
 * @returns {Promise<EventRow|null>} The updated event row.
 */
export async function triggerNow(event) {
  await fireEvent(event);

  const now = new Date();
  const updates = { last_triggered_at: now.toISOString() };

  if (event.repeat) {
    const nextTrigger = new Date(now.getTime() + event.duration_ms);
    updates.next_trigger_at = nextTrigger.toISOString();
  } else {
    updates.status = 'cancelled';
  }

  const updated = await updateEvent(event.id, event.guild_id, updates);

  if (updated && updated.status === 'active') {
    scheduleEvent(updated);
  }

  return updated;
}
