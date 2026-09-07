# Event Ping

A Discord bot for creating and managing automatic event timers that ping a specific role when they fire.

## Features

- **`/event create`** — Create a new timed event with a role ping
- **`/event list`** — List all events on the server
- **`/event info`** — View detailed information about a specific event
- **`/event edit`** — Modify an existing event (any field, all optional except `event_id`)
- **`/event stop`** — Pause an event temporarily
- **`/event resume`** — Resume a paused event
- **`/event restart`** — Reset the timer to its full duration immediately
- **`/event trigger`** — Fire an event immediately (and reschedule if repeating)
- **`/event cancel`** — Cancel the next trigger without deleting the event
- **`/event delete`** — Permanently delete an event (with confirmation buttons)

## How it works

1. You create an event with `/event create`, specifying a name, duration, channel, role, and message.
2. The bot displays the next trigger time using Discord's `<t:TIMESTAMP:R>` format, which auto-updates for each user — no message editing needed.
3. When the timer reaches zero, the bot sends the configured message and pings the role.
4. If `repeat` is enabled, the timer automatically restarts and the event fires again on the next cycle.
5. Events are persisted in a Supabase database, so they survive bot restarts. On startup, the bot recovers all active events, reschedules them, and handles missed triggers.

## Duration format

Durations support combinations of these units:

| Unit | Meaning |
|------|---------|
| `s`  | seconds |
| `m`  | minutes |
| `h`  | hours   |
| `d`  | days    |

Examples: `10s`, `30m`, `1h`, `6h`, `24h`, `2d`, `1h30m`, `2d6h30m`

## Setup

### 1. Create a Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application and add a Bot to it.
3. Copy the bot **token**.
4. Copy the **Application ID** (client ID).
5. Enable the **Message Content Intent** and **Server Members Intent** if needed (the bot uses Guilds + GuildMessages intents).
6. Invite the bot to your server with the `applications.commands` and `bot` scopes, plus permissions to send messages and mention roles.

### 2. Configure environment variables

Create or edit the `.env` file in the project root:

```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_test_guild_id_here   # optional — for instant command registration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> `DISCORD_GUILD_ID` is optional. If set, slash commands register instantly for that guild. If omitted, commands register globally (can take up to 1 hour to appear).

### 3. Register slash commands

Run this once to register the `/event` command with Discord:

```bash
npm run register
```

### 4. Start the bot

```bash
npm start
```

## Permissions

Only server administrators or members with the **Manage Guild** permission can create, edit, stop, resume, restart, trigger, cancel, or delete events. Regular members can only see the public timer/announcement messages.

## Architecture

- **`src/index.js`** — Bot entry point: logs in, recovers events on startup, dispatches interactions.
- **`src/commands.js`** — Slash command definitions (the `/event` command with all subcommands).
- **`src/deploy-commands.js`** — Registers slash commands with the Discord API.
- **`src/handlers.js`** — Logic for each subcommand (create, list, info, edit, stop, resume, restart, trigger, cancel, delete) and the delete confirmation button handler.
- **`src/scheduler.js`** — In-memory timer scheduling with `setTimeout`, event firing, and startup recovery.
- **`src/events.js`** — Database CRUD operations (Supabase queries).
- **`src/duration.js`** — Duration string parser (`1h30m` → milliseconds) and formatter.
- **`src/embeds.js`** — Discord embed builders for event info, lists, errors, and confirmations.
- **`src/db.js`** — Supabase client singleton.

## Persistence

All events are stored in a Supabase PostgreSQL database. When the bot restarts:

1. It fetches all events with `status = 'active'`.
2. If a trigger time has passed during downtime, repeating events are advanced to the next future trigger (no spam), and one-shot events fire their missed trigger.
3. Future triggers are scheduled normally with `setTimeout`.

This means timers are reliable and continue working across restarts — they don't rely on ephemeral in-memory state.
