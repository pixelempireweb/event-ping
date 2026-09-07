import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { formatDuration, toUnix } from './duration.js';

const STATUS_EMOJI = {
  active: '🟢',
  paused: '⏸️',
  cancelled: '🔴',
  deleted: '⚪',
};

const STATUS_LABEL = {
  active: 'Actif',
  paused: 'En pause',
  cancelled: 'Annulé',
  deleted: 'Supprimé',
};

/**
 * Build the embed for a single event's info display.
 * @param {EventRow} event
 * @returns {EmbedBuilder}
 */
export function buildEventEmbed(event) {
  const triggerUnix = toUnix(event.next_trigger_at);
  const lastTriggeredText = event.last_triggered_at
    ? `<t:${toUnix(event.last_triggered_at)}:F>`
    : 'Jamais';

  return new EmbedBuilder()
    .setTitle(`⏰ **${event.name.toUpperCase()}**`)
    .setColor(event.status === 'active' ? 0x2ecc71 : event.status === 'paused' ? 0xf39c12 : 0x95a5a6)
    .addFields(
      { name: '🆔 ID', value: `\`${event.id}\``, inline: true },
      { name: '📊 Statut', value: `${STATUS_EMOJI[event.status] || '⚪'} ${STATUS_LABEL[event.status] || event.status}`, inline: true },
      { name: '⏱️ Durée', value: `\`${event.duration_text}\` (${formatDuration(event.duration_ms)})`, inline: true },
      { name: '📅 Prochain déclenchement', value: `<t:${triggerUnix}:R>\n(\`<t:${triggerUnix}:F>\`)`, inline: false },
      { name: '💬 Salon', value: `<#${event.channel_id}>`, inline: true },
      { name: '🏷️ Rôle', value: `<@&${event.role_id}>`, inline: true },
      { name: '🔁 Répétition', value: event.repeat ? '✅ Activée' : '❌ Désactivée', inline: true },
      { name: '📨 Message', value: event.message, inline: false },
      { name: '🕐 Dernier déclenchement', value: lastTriggeredText, inline: false }
    )
    .setFooter({ text: `Event Ping — ID #${event.id}` })
    .setTimestamp();
}

/**
 * Build the embed for the event list.
 * @param {EventRow[]} events
 * @returns {EmbedBuilder}
 */
export function buildListEmbed(events) {
  const embed = new EmbedBuilder()
    .setTitle('📋 Événements actifs')
    .setColor(0x3498db)
    .setTimestamp();

  if (events.length === 0) {
    embed.setDescription('Aucun événement configuré sur ce serveur.\n\nUtilisez `/event create` pour en créer un.');
    return embed;
  }

  for (const event of events) {
    const triggerUnix = toUnix(event.next_trigger_at);
    const statusEmoji = STATUS_EMOJI[event.status] || '⚪';

    embed.addFields({
      name: `${statusEmoji} **${event.name}** — ID: \`${event.id}\``,
      value: [
        `Salon : <#${event.channel_id}>`,
        `Rôle : <@&${event.role_id}>`,
        `Prochain déclenchement : <t:${triggerUnix}:R>`,
        `Répétition : ${event.repeat ? '✅ Activée' : '❌ Désactivée'}`,
        `Statut : ${STATUS_LABEL[event.status] || event.status}`,
      ].join('\n'),
      inline: false,
    });
  }

  embed.setFooter({ text: `${events.length} événement(s)` });
  return embed;
}

/**
 * Build the confirmation embed for event deletion.
 * @param {EventRow} event
 * @returns {EmbedBuilder}
 */
export function buildDeleteConfirmationEmbed(event) {
  return new EmbedBuilder()
    .setTitle('⚠️ Confirmation de suppression')
    .setColor(0xe74c3c)
    .setDescription(
      [
        `Voulez-vous vraiment supprimer définitivement l'événement **${event.name}** (ID: \`${event.id}\`) ?`,
        '',
        'Cette action est **irréversible**.',
      ].join('\n')
    )
    .setTimestamp();
}

/**
 * Build the confirmation row with Confirm/Cancel buttons for deletion.
 * @param {number} eventId
 * @returns {ActionRowBuilder}
 */
export function buildDeleteConfirmationRow(eventId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_delete_confirm_${eventId}`)
      .setLabel('Confirmer')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`event_delete_cancel_${eventId}`)
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
  );
}

/**
 * Build a success embed.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
export function buildSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setColor(0x2ecc71)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Build an error embed.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
export function buildErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setColor(0xe74c3c)
    .setDescription(description)
    .setTimestamp();
}
