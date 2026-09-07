import {
  createEvent,
  getEvent,
  listEvents,
  updateEvent,
  deleteEvent,
} from './events.js';
import { parseDuration, toUnix } from './duration.js';
import {
  scheduleEvent,
  rescheduleEvent,
  cancelTimer,
  triggerNow,
} from './scheduler.js';
import {
  buildEventEmbed,
  buildListEmbed,
  buildDeleteConfirmationEmbed,
  buildDeleteConfirmationRow,
  buildSuccessEmbed,
  buildErrorEmbed,
} from './embeds.js';

/**
 * Check if a guild member has permission to manage events.
 * Administrators and members with "Manage Guild" permission have access.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function hasPermission(member) {
  if (!member) return false;
  return member.permissions.has('Administrator') || member.permissions.has('ManageGuild');
}

/**
 * Find an event or reply with a "not found" error.
 * @returns {Promise<EventRow|null>} The event, or null if an error reply was sent.
 */
async function findEventOrReply(interaction, eventId, guildId) {
  const event = await getEvent(eventId, guildId);
  if (!event || event.status === 'deleted') {
    await interaction.reply({
      embeds: [
        buildErrorEmbed(
          'Événement introuvable',
          `Aucun événement avec l'ID \`${eventId}\` n'a été trouvé sur ce serveur.`
        ),
      ],
      ephemeral: true,
    });
    return null;
  }
  return event;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dispatcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main interaction handler for the /event command.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function handleEventCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (!guildId) {
    return interaction.reply({
      embeds: [buildErrorEmbed('Erreur', 'Cette commande ne peut être utilisée que dans un serveur.')],
      ephemeral: true,
    });
  }

  if (!hasPermission(interaction.member)) {
    return interaction.reply({
      embeds: [
        buildErrorEmbed(
          'Permissions insuffisantes',
          'Vous devez être administrateur ou avoir la permission « Gérer le serveur » pour gérer les événements.'
        ),
      ],
      ephemeral: true,
    });
  }

  try {
    switch (subcommand) {
      case 'create':  return await handleCreate(interaction, guildId);
      case 'list':    return await handleList(interaction, guildId);
      case 'info':    return await handleInfo(interaction, guildId);
      case 'edit':    return await handleEdit(interaction, guildId);
      case 'stop':    return await handleStop(interaction, guildId);
      case 'resume':  return await handleResume(interaction, guildId);
      case 'restart': return await handleRestart(interaction, guildId);
      case 'trigger': return await handleTrigger(interaction, guildId);
      case 'cancel':  return await handleCancel(interaction, guildId);
      case 'delete':  return await handleDelete(interaction, guildId);
      default:
        return interaction.reply({
          embeds: [buildErrorEmbed('Erreur', `Sous-commande inconnue : \`${subcommand}\``)],
          ephemeral: true,
        });
    }
  } catch (err) {
    console.error(`[Commands] Error in /event ${subcommand}:`, err);
    const errorMessage = err.message || 'Une erreur inconnue est survenue.';
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({
        embeds: [buildErrorEmbed('Erreur', errorMessage)],
        ephemeral: true,
      });
    }
    return interaction.reply({
      embeds: [buildErrorEmbed('Erreur', errorMessage)],
      ephemeral: true,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// create
// ─────────────────────────────────────────────────────────────────────────────

async function handleCreate(interaction, guildId) {
  const name = interaction.options.getString('name');
  const durationStr = interaction.options.getString('duration');
  const channel = interaction.options.getChannel('channel');
  const role = interaction.options.getRole('role');
  const message = interaction.options.getString('message');
  const repeat = interaction.options.getBoolean('repeat') ?? false;

  let durationMs;
  try {
    durationMs = parseDuration(durationStr);
  } catch (err) {
    return interaction.reply({
      embeds: [buildErrorEmbed('Durée invalide', err.message)],
      ephemeral: true,
    });
  }

  const now = new Date();
  const nextTrigger = new Date(now.getTime() + durationMs);

  const event = await createEvent({
    guild_id: guildId,
    name,
    duration_ms: durationMs,
    original_duration_ms: durationMs,
    duration_text: durationStr,
    channel_id: channel.id,
    role_id: role.id,
    message,
    repeat,
    status: 'active',
    next_trigger_at: nextTrigger.toISOString(),
    last_triggered_at: null,
  });

  scheduleEvent(event);

  return interaction.reply({
    embeds: [buildEventEmbed(event).setTitle(`✅ Événement créé : **${name.toUpperCase()}**`)],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// list
// ─────────────────────────────────────────────────────────────────────────────

async function handleList(interaction, guildId) {
  const events = await listEvents(guildId);
  return interaction.reply({ embeds: [buildListEmbed(events)] });
}

// ─────────────────────────────────────────────────────────────────────────────
// info
// ─────────────────────────────────────────────────────────────────────────────

async function handleInfo(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  return interaction.reply({ embeds: [buildEventEmbed(event)] });
}

// ─────────────────────────────────────────────────────────────────────────────
// edit
// ─────────────────────────────────────────────────────────────────────────────

async function handleEdit(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  const updates = {};
  const changed = [];

  const name = interaction.options.getString('name');
  if (name !== null) { updates.name = name; changed.push('nom'); }

  const durationStr = interaction.options.getString('duration');
  if (durationStr !== null) {
    try {
      const durationMs = parseDuration(durationStr);
      updates.duration_ms = durationMs;
      updates.original_duration_ms = durationMs;
      updates.duration_text = durationStr;
      changed.push('durée');
    } catch (err) {
      return interaction.reply({
        embeds: [buildErrorEmbed('Durée invalide', err.message)],
        ephemeral: true,
      });
    }
  }

  const channel = interaction.options.getChannel('channel');
  if (channel !== null) { updates.channel_id = channel.id; changed.push('salon'); }

  const role = interaction.options.getRole('role');
  if (role !== null) { updates.role_id = role.id; changed.push('rôle'); }

  const message = interaction.options.getString('message');
  if (message !== null) { updates.message = message; changed.push('message'); }

  const repeat = interaction.options.getBoolean('repeat');
  if (repeat !== null) { updates.repeat = repeat; changed.push('répétition'); }

  if (changed.length === 0) {
    return interaction.reply({
      embeds: [buildErrorEmbed('Aucune modification', 'Vous devez spécifier au moins un champ à modifier.')],
      ephemeral: true,
    });
  }

  // If duration changed and event is active, reset next trigger from now
  if (updates.duration_ms !== undefined && event.status === 'active') {
    updates.next_trigger_at = new Date(Date.now() + updates.duration_ms).toISOString();
  }

  await updateEvent(eventId, guildId, updates);

  if (event.status === 'active') {
    await rescheduleEvent(eventId, guildId);
  }

  const freshEvent = await getEvent(eventId, guildId);
  return interaction.reply({
    embeds: [
      buildEventEmbed(freshEvent)
        .setTitle(`✏️ Événement modifié : **${freshEvent.name.toUpperCase()}**`)
        .setDescription(`Champs modifiés : ${changed.map((c) => `\`${c}\``).join(', ')}`),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// stop (pause)
// ─────────────────────────────────────────────────────────────────────────────

async function handleStop(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  if (event.status === 'paused') {
    return interaction.reply({
      embeds: [buildErrorEmbed('Événement déjà en pause',
        `L'événement **${event.name}** est déjà en pause. Utilisez \`/event resume\` pour le reprendre.`)],
      ephemeral: true,
    });
  }

  if (event.status !== 'active') {
    return interaction.reply({
      embeds: [buildErrorEmbed('Action impossible',
        `L'événement **${event.name}** a le statut « ${event.status} » et ne peut pas être mis en pause.`)],
      ephemeral: true,
    });
  }

  // Pause: cancel in-memory timer, set status to paused.
  // We keep next_trigger_at as-is so resume can compute remaining time.
  cancelTimer(eventId);
  await updateEvent(eventId, guildId, { status: 'paused' });

  return interaction.reply({
    embeds: [buildSuccessEmbed('Événement mis en pause',
      `L'événement **${event.name}** (ID: \`${eventId}\`) a été mis en pause.\nUtilisez \`/event resume\` pour le reprendre.`)],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// resume
// ─────────────────────────────────────────────────────────────────────────────

async function handleResume(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  if (event.status !== 'paused') {
    return interaction.reply({
      embeds: [buildErrorEmbed('Événement non en pause',
        `L'événement **${event.name}** n'est pas en pause (statut actuel : ${event.status}).`)],
      ephemeral: true,
    });
  }

  // Recalculate next trigger:
  // If the original trigger time is still in the future, keep it.
  // If it has passed (e.g. bot was down for a long time), restart from full duration.
  const now = Date.now();
  const triggerMs = new Date(event.next_trigger_at).getTime();
  const remaining = triggerMs - now;

  let nextTriggerDate;
  if (remaining > 0) {
    nextTriggerDate = new Date(triggerMs);
  } else {
    nextTriggerDate = new Date(now + event.duration_ms);
  }

  const updated = await updateEvent(eventId, guildId, {
    status: 'active',
    next_trigger_at: nextTriggerDate.toISOString(),
  });

  scheduleEvent(updated);

  return interaction.reply({
    embeds: [buildSuccessEmbed('Événement repris',
      `L'événement **${event.name}** (ID: \`${eventId}\`) a été repris.\nProchain déclenchement : <t:${toUnix(nextTriggerDate)}:R>`)],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// restart — reset timer to full duration from now
// ─────────────────────────────────────────────────────────────────────────────

async function handleRestart(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  if (event.status === 'deleted') {
    return interaction.reply({
      embeds: [buildErrorEmbed('Action impossible', 'Cet événement a été supprimé.')],
      ephemeral: true,
    });
  }

  const now = new Date();
  const nextTrigger = new Date(now.getTime() + event.duration_ms);

  const updated = await updateEvent(eventId, guildId, {
    status: 'active',
    next_trigger_at: nextTrigger.toISOString(),
  });

  // Reschedule (cancels old timer and starts new one)
  cancelTimer(eventId);
  scheduleEvent(updated);

  return interaction.reply({
    embeds: [buildSuccessEmbed('Timer redémarré',
      `Le timer de l'événement **${event.name}** (ID: \`${eventId}\`) a été remis à \`${event.duration_text}\`.\nProchain déclenchement : <t:${toUnix(nextTrigger)}:R>`)],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// trigger — fire immediately, then reschedule if repeating
// ─────────────────────────────────────────────────────────────────────────────

async function handleTrigger(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  await interaction.deferReply();

  const updated = await triggerNow(event);

  if (updated && updated.status === 'active') {
    return interaction.editReply({
      embeds: [buildSuccessEmbed('Événement déclenché',
        `L'événement **${event.name}** (ID: \`${eventId}\`) a été déclenché manuellement.\nProchain déclenchement : <t:${toUnix(updated.next_trigger_at)}:R>`)],
    });
  }

  return interaction.editReply({
    embeds: [buildSuccessEmbed('Événement déclenché',
      `L'événement **${event.name}** (ID: \`${eventId}\`) a été déclenché manuellement. Il ne se répétera pas (répétition désactivée).`)],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// cancel — cancel the next trigger without deleting the event
// ─────────────────────────────────────────────────────────────────────────────

async function handleCancel(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  if (event.status === 'cancelled') {
    return interaction.reply({
      embeds: [buildErrorEmbed('Événement déjà annulé',
        `Le prochain déclenchement de l'événement **${event.name}** est déjà annulé.`)],
      ephemeral: true,
    });
  }

  cancelTimer(eventId);
  await updateEvent(eventId, guildId, { status: 'cancelled' });

  return interaction.reply({
    embeds: [buildSuccessEmbed('Déclenchement annulé',
      `Le prochain déclenchement de l'événement **${event.name}** (ID: \`${eventId}\`) a été annulé.\nUtilisez \`/event restart\` pour relancer le timer.`)],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// delete — permanently delete (with confirmation buttons)
// ─────────────────────────────────────────────────────────────────────────────

async function handleDelete(interaction, guildId) {
  const eventId = interaction.options.getInteger('event_id');
  const event = await findEventOrReply(interaction, eventId, guildId);
  if (!event) return;

  return interaction.reply({
    embeds: [buildDeleteConfirmationEmbed(event)],
    components: [buildDeleteConfirmationRow(eventId)],
    ephemeral: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Button handler for delete confirmation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle button interactions for delete confirmation.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
export async function handleDeleteButton(interaction) {
  const customId = interaction.customId;
  if (!customId.startsWith('event_delete_')) return;

  const parts = customId.split('_');
  const action = parts[2];
  const eventId = parseInt(parts[3], 10);
  const guildId = interaction.guildId;

  if (action === 'cancel') {
    return interaction.update({
      embeds: [buildSuccessEmbed('Suppression annulée', 'La suppression de l\'événement a été annulée.')],
      components: [],
    });
  }

  if (action === 'confirm') {
    const event = await getEvent(eventId, guildId);
    if (!event) {
      return interaction.update({
        embeds: [buildErrorEmbed('Événement introuvable', `L'événement #${eventId} n'existe plus.`)],
        components: [],
      });
    }

    cancelTimer(eventId);
    const name = event.name;
    await deleteEvent(eventId, guildId);

    return interaction.update({
      embeds: [buildSuccessEmbed('Événement supprimé',
        `L'événement **${name}** (ID: \`${eventId}\`) a été supprimé définitivement.`)],
      components: [],
    });
  }
}
