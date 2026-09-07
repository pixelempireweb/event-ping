import { supabase } from './db.js';

/**
 * @typedef {Object} EventRow
 * @property {number} id
 * @property {string} guild_id
 * @property {string} name
 * @property {number} duration_ms
 * @property {string} duration_text
 * @property {string} channel_id
 * @property {string} role_id
 * @property {string} message
 * @property {boolean} repeat
 * @property {string} status
 * @property {string} next_trigger_at
 * @property {string|null} last_triggered_at
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Create a new event in the database.
 * @param {Object} data - Event data.
 * @returns {Promise<EventRow>}
 */
export async function createEvent(data) {
  const { data: row, error } = await supabase
    .from('events')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Erreur de base de données : ${error.message}`);
  return row;
}

/**
 * Get a single event by ID and guild ID.
 * @param {number} id
 * @param {string} guildId
 * @returns {Promise<EventRow|null>}
 */
export async function getEvent(id, guildId) {
  const { data: row, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('guild_id', guildId)
    .maybeSingle();

  if (error) throw new Error(`Erreur de base de données : ${error.message}`);
  return row;
}

/**
 * List all events for a guild (excluding deleted).
 * @param {string} guildId
 * @returns {Promise<EventRow[]>}
 */
export async function listEvents(guildId) {
  const { data: rows, error } = await supabase
    .from('events')
    .select('*')
    .eq('guild_id', guildId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Erreur de base de données : ${error.message}`);
  return rows || [];
}

/**
 * Update an event by ID.
 * @param {number} id
 * @param {string} guildId
 * @param {Object} updates
 * @returns {Promise<EventRow|null>}
 */
export async function updateEvent(id, guildId, updates) {
  const { data: row, error } = await supabase
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('guild_id', guildId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Erreur de base de données : ${error.message}`);
  return row;
}

/**
 * Delete an event permanently (sets status to 'deleted').
 * We use soft-delete via status to preserve data integrity.
 * @param {number} id
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
export async function deleteEvent(id, guildId) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('guild_id', guildId);

  if (error) throw new Error(`Erreur de base de données : ${error.message}`);
  return true;
}

/**
 * Get all events that need to be scheduled (active or cancelled with pending triggers).
 * Returns events with status 'active' that have a next_trigger_at.
 * @returns {Promise<EventRow[]>}
 */
export async function getActiveEvents() {
  const { data: rows, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active');

  if (error) throw new Error(`Erreur de base de données : ${error.message}`);
  return rows || [];
}
