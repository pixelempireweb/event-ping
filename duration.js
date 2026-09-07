const UNIT_MS = {
  d: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  m: 60 * 1000,
  s: 1000,
};

/**
 * Parse a human-readable duration string into milliseconds.
 * Supports combinations like "1h30m", "2d6h", "10s", "30m", "24h", "2d".
 * @param {string} input - The duration string to parse.
 * @returns {number} Milliseconds.
 * @throws {Error} If the format is invalid or no units are found.
 */
export function parseDuration(input) {
  if (typeof input !== 'string') {
    throw new Error('La durée doit être une chaîne de caractères.');
  }

  const cleaned = input.trim().toLowerCase();

  // Accept pure numbers as seconds
  if (/^\d+$/.test(cleaned)) {
    const seconds = parseInt(cleaned, 10);
    if (seconds <= 0) throw new Error('La durée doit être supérieure à 0.');
    return seconds * 1000;
  }

  const regex = /(\d+)\s*(d|h|m|s)/g;
  let total = 0;
  let match;
  let found = false;

  while ((match = regex.exec(cleaned)) !== null) {
    found = true;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    total += value * UNIT_MS[unit];
  }

  if (!found) {
    throw new Error(
      `Format de durée invalide : "${input}". Exemples valides : 10s, 30m, 1h, 6h, 24h, 2d, 1h30m.`
    );
  }

  if (total <= 0) {
    throw new Error('La durée doit être supérieure à 0.');
  }

  return total;
}

/**
 * Format a duration in milliseconds back into a human-readable string.
 * @param {number} ms - Milliseconds.
 * @returns {string} Human-readable duration like "1h30m".
 */
export function formatDuration(ms) {
  if (ms <= 0) return '0s';

  const days = Math.floor(ms / UNIT_MS.d);
  const hours = Math.floor((ms % UNIT_MS.d) / UNIT_MS.h);
  const minutes = Math.floor((ms % UNIT_MS.h) / UNIT_MS.m);
  const seconds = Math.floor((ms % UNIT_MS.m) / UNIT_MS.s);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join('') || '0s';
}

/**
 * Get the Unix timestamp (seconds) for a date that is `ms` milliseconds from now.
 * @param {number} ms - Milliseconds from now.
 * @param {Date} [from=new Date()] - Starting point.
 * @returns {number} Unix timestamp in seconds.
 */
export function timestampFromNow(ms, from = new Date()) {
  return Math.floor((from.getTime() + ms) / 1000);
}

/**
 * Get the Unix timestamp (seconds) for a Date object.
 * @param {Date} date - The date to convert.
 * @returns {number} Unix timestamp in seconds.
 */
export function toUnix(date) {
  return Math.floor(new Date(date).getTime() / 1000);
}
