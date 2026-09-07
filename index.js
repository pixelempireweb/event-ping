import { Client, GatewayIntentBits, Events } from 'discord.js';
import { setClient, recoverAllEvents } from './scheduler.js';
import { handleEventCommand, handleDeleteButton } from './handlers.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error(
    '[FATAL] Missing DISCORD_TOKEN environment variable.\n' +
      'Create a bot at https://discord.com/developers/applications, ' +
      'get its token, and set DISCORD_TOKEN in your .env file.'
  );
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`[Bot] Event Ping is online — logged in as ${c.user.tag}`);
  setClient(c);

  // Recover all active events from the database and schedule them
  try {
    await recoverAllEvents();
  } catch (err) {
    console.error('[Bot] Error during event recovery:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'event') {
        await handleEventCommand(interaction);
      }
      return;
    }

    // Handle button interactions (delete confirmation)
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('event_delete_')) {
        await handleDeleteButton(interaction);
      }
      return;
    }
  } catch (err) {
    console.error('[Bot] Unhandled interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: '❌ Une erreur inattendue est survenue. Veuillez réessayer.',
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
});

client.login(token);
