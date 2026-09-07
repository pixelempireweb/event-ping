import { REST, Routes } from 'discord.js';
import { commandJSON } from './commands.js';

/**
 * Register slash commands with Discord.
 * Run with: node src/deploy-commands.js
 * Requires DISCORD_TOKEN and DISCORD_CLIENT_ID environment variables.
 */
async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    console.error(
      '[FATAL] Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables.'
    );
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`[Deploy] Registering ${commandJSON.length} slash command(s)...`);

    // If GUILD_ID is set, register to that guild (instant). Otherwise, global (up to 1h cache).
    const guildId = process.env.DISCORD_GUILD_ID;

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandJSON,
      });
      console.log(`[Deploy] Registered guild commands for guild ${guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandJSON,
      });
      console.log('[Deploy] Registered global commands (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('[Deploy] Error registering commands:', err);
    process.exit(1);
  }
}

deployCommands();
