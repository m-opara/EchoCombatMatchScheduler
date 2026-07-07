# Echo Combat Match Scheduler

Echo Combat Match Scheduler is a Discord bot for planning public Echo Combat matches. It lets players create scheduled events, join or leave from Discord buttons, view upcoming matches, receive reminders, and automatically clean up expired events.

Status: v1.1.0 release.

>[!TIP]
>Run the `quick setup.bat` file to install dependencies and compile in one go.

## Core Features

- Slash commands for scheduling, viewing, and configuring matches.
- Moderator slash commands for editing or deleting events by board message link.
- Per-event Discord messages with Join and Leave buttons.
- Upcoming events board that keeps event messages ordered by start time.
- Configurable event title emoji per server.
- Automatic creator signup when an event is scheduled.
- Event deletion when the last player leaves.
- DM reminders for signed-up players.
- Role reminder pings in a configured channel.
- Individual fallback mentions for signed-up players who do not have the ping role.
- Reminder logs that prevent duplicate reminders for the same event, offset, and reminder type.
- Expiry cleanup for events after their configured post-start grace period.
- SQLite persistence through Prisma.
- Docker Compose self-hosting.

## Discord Setup

1. Create an application in the Discord Developer Portal.
2. Add a bot user to the application and copy the bot token.
3. Copy the application client ID.
4. Invite the bot to your server with application commands enabled.
5. Add the values to `.env`.
6. Register slash commands:

```sh
npm run commands:register
```

`DISCORD_GUILD_ID` is required by the command registration script because commands are registered to one guild for fast iteration.

## Required Bot Permissions

The bot needs these permissions in the channels it uses:

- View Channels
- Send Messages
- Read Message History
- Manage Messages
- Use Slash Commands

For reminders, the bot also needs permission to mention the configured ping role. The role should be mentionable by the bot, and the bot role must be high enough in the server role order for Discord to allow the mention.

The bot uses the `Guilds` gateway intent. It does not require privileged intents for v1.1.0.

## Environment Variables

Create `.env` from `.env.example`:

```sh
cp .env.example .env
```

Required variables:

- `DISCORD_TOKEN`: Bot token from the Discord Developer Portal.
- `DISCORD_CLIENT_ID`: Application client ID.
- `DISCORD_GUILD_ID`: Guild ID used by `npm run commands:register`.
- `DATABASE_URL`: Prisma database URL. Defaults to SQLite, for example `file:./dev.db`.

## Local Development

Install dependencies:

```sh
npm install
```

Generate the Prisma client and apply migrations:

```sh
npm run prisma:migrate
```

Register slash commands after changing command definitions:

```sh
npm run commands:register
```

Run the bot in development:

```sh
npm run dev
```

Build and run the compiled app:

```sh
npm run build
npm start
```

## Prisma Setup

The schema lives in `prisma/schema.prisma`, and migrations live in `prisma/migrations`.

Common commands:

- `npm run prisma:generate`: generate the Prisma client.
- `npm run prisma:migrate`: apply migrations in development and update the local SQLite database.

The default local database URL in `.env.example` is:

```env
DATABASE_URL="file:./dev.db"
```

Local SQLite files are ignored by git.

## Docker Compose Self-Hosting

Create `.env`, fill in the Discord values, then run:

```sh
docker compose up --build
```

Compose sets:

```env
DATABASE_URL="file:/data/dev.db"
```

SQLite data is stored in the `sqlite-data` named volume mounted at `/data`.

## Slash Commands

- `/ping`: Basic health check command.
- `/schedule title start timezone`: Schedule a public match. `start` uses `MM-dd-yyyy h:mm AM/PM`, for example `07-15-2026 8:00 PM`. `timezone` is an IANA timezone such as `America/New_York` and supports autocomplete.
- `/events`: Show upcoming events with Discord timestamps and current signups.
- `/event-edit message title`: Edit an event title. `message` accepts a Discord message link copied from the event board message or the raw message ID. Requires the Manage Events permission by default.
- `/event-delete message`: Delete an event. `message` accepts a Discord message link copied from the event board message or the raw message ID. Requires the Manage Events permission by default.
- `/config`: Show current server config when used without options.
- `/config upcoming_channel`: Set the channel for upcoming event board messages.
- `/config reminder_channel`: Set the channel for role reminder pings.
- `/config ping_role`: Set the role mentioned by role reminders.
- `/config event_emoji`: Set the emoji shown beside event titles, for example `<:echothinking:1523785136632496168>`.
- `/config dm_reminder_offsets`: Set comma-separated DM offsets in minutes before the event, for example `720,60`.
- `/config role_reminder_offsets`: Set comma-separated role ping offsets in minutes before the event, for example `60,2`.
- `/config event_expiry_offset`: Set minutes after event start before cleanup removes the event.

## Configuration Options

Configuration is stored per Discord guild in `GuildConfig`.

Defaults:

- DM reminder offsets: `720,60`
- Role reminder offsets: `60,2`
- Event expiry offset: `90` minutes
- Event emoji: `<:echothinking:1523785136632496168>`

Channel and role settings are optional, but reminders that require missing settings are skipped and logged as errors.

## Reminder Behavior

The reminder scheduler starts when the Discord client is ready and ticks once per minute.

For each future event, it checks the configured DM and role reminder offsets. A reminder is due when the current time is at or after the offset time and before the event start time.

DM reminders are sent to signed-up users. Role reminders are sent to the configured reminder channel and mention the configured ping role. Signed-up users who do not have the ping role are also mentioned individually so they still receive the ping.

Each successful reminder creates a `ReminderLog`, which prevents duplicate sends for the same event, offset, and reminder type.

## Event Expiry Cleanup

Expired event cleanup runs during the reminder tick. Events become eligible after:

```text
event start time + event_expiry_offset minutes
```

When an event expires, the bot deletes its board message when available, removes the event from the database, and refreshes the upcoming events board for that guild.

## Discord Timestamps and Timezones

Scheduled times are parsed with Luxon from the user-provided local time and IANA timezone, then stored in UTC.

Discord output uses timestamp markup such as `<t:...:F>` and `<t:...:R>`. Discord renders these in each viewer's local timezone, so different users may see different local clock times while referring to the same event instant.

## Troubleshooting

- Commands do not appear: run `npm run commands:register` with the correct `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, and token.
- Event edit/delete cannot find the event: copy the link from the bot's event board message, or provide that message's raw ID.
- Bot cannot post board messages: check `upcoming_channel`, View Channels, Send Messages, Read Message History, and Manage Messages permissions.
- Role reminders do not ping: check `reminder_channel`, `ping_role`, role order, and mention permissions.
- DM reminders fail for a player: the user may have DMs disabled or may block bot DMs.
- Times look wrong: use an IANA timezone like `America/New_York`, not an abbreviation like `EST`.
- SQLite database missing locally: run `npm run prisma:migrate`.
- Docker database appears reset: confirm the `sqlite-data` volume still exists.

## Architecture Overview

- `src/index.ts`: application entrypoint.
- `src/discord/client.ts`: Discord client setup, interaction routing, and reminder scheduler startup.
- `src/registerCommands.ts`: guild slash command registration.
- `src/commands`: slash command definitions and handlers.
- `src/buttons`: Join and Leave button routing.
- `src/services/EventService.ts`: event creation, signup, leave, and delete business logic.
- `src/services/ScheduleBoardService.ts`: event board reconciliation and message cleanup.
- `src/services/ReminderService.ts`: reminder ticking, duplicate protection, and expiry cleanup.
- `src/services/ReminderDispatcher.ts`: DM and role reminder delivery.
- `src/repositories`: Prisma data access.
- `src/discord/eventMessage.ts`: Discord event message content and buttons.
- `src/util/dateTime.ts`: time parsing and Discord timestamp helpers.
- `src/util/discordMessageReference.ts`: Discord message link and raw ID parsing.
- `prisma/schema.prisma`: data model for guild config, events, signups, and reminder logs.

## Release Note

v1.1.0 adds configurable event emoji support and event moderation commands for editing or deleting scheduled matches.

v1.0.0 is the first complete release of the Echo Combat Match Scheduler bot. It includes scheduling, signup buttons, ordered event board reconciliation, configurable reminders, reminder delivery, and expired event cleanup.
