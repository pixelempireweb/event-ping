import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';

export const eventCommand = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Gérer les événements et timers automatiques')
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('create')
      .setDescription('Créer un nouvel événement')
      .addStringOption((o) =>
        o.setName('name').setDescription('Nom de l\'événement').setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName('duration')
          .setDescription('Durée avant déclenchement (ex: 30m, 1h, 1h30m, 2d)')
          .setRequired(true)
      )
      .addChannelOption((o) =>
        o.setName('channel').setDescription('Salon où l\'événement sera annoncé').setRequired(true)
      )
      .addRoleOption((o) =>
        o.setName('role').setDescription('Rôle à mentionner au déclenchement').setRequired(true)
      )
      .addStringOption((o) =>
        o.setName('message').setDescription('Message envoyé au déclenchement').setRequired(true)
      )
      .addBooleanOption((o) =>
        o.setName('repeat').setDescription('Répéter automatiquement l\'événement').setRequired(false)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('list')
      .setDescription('Afficher tous les événements du serveur')
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('info')
      .setDescription('Afficher les informations détaillées d\'un événement')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement').setRequired(true)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('edit')
      .setDescription('Modifier un événement existant')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement à modifier').setRequired(true)
      )
      .addStringOption((o) =>
        o.setName('name').setDescription('Nouveau nom').setRequired(false)
      )
      .addStringOption((o) =>
        o.setName('duration').setDescription('Nouvelle durée (ex: 1h, 30m, 1h30m)').setRequired(false)
      )
      .addChannelOption((o) =>
        o.setName('channel').setDescription('Nouveau salon').setRequired(false)
      )
      .addRoleOption((o) =>
        o.setName('role').setDescription('Nouveau rôle').setRequired(false)
      )
      .addStringOption((o) =>
        o.setName('message').setDescription('Nouveau message').setRequired(false)
      )
      .addBooleanOption((o) =>
        o.setName('repeat').setDescription('Activer/désactiver la répétition').setRequired(false)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('stop')
      .setDescription('Mettre un événement en pause')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement').setRequired(true)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('resume')
      .setDescription('Reprendre un événement en pause')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement').setRequired(true)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('restart')
      .setDescription('Recommencer le timer depuis sa durée initiale')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement').setRequired(true)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('trigger')
      .setDescription('Déclencher immédiatement un événement')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement').setRequired(true)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('cancel')
      .setDescription('Annuler le prochain déclenchement d\'un événement')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement').setRequired(true)
      )
  )
  .addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName('delete')
      .setDescription('Supprimer définitivement un événement')
      .addIntegerOption((o) =>
        o.setName('event_id').setDescription('ID de l\'événement').setRequired(true)
      )
  );

export const commands = [eventCommand];

export const commandJSON = commands.map((cmd) => cmd.toJSON());
