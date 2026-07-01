# Echo Combat Match Scheduler

A minimal Discord scheduling bot project shell for Echo Combat match planning.

This repository is intentionally only the initial setup. It does not include slash commands, scheduling logic, reminders, buttons, reactions, or event business logic yet.

## Setup

Copy the example environment file:

```sh
cp .env.example .env
```

Fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` in `.env`.

Install dependencies:

```sh
npm install
```

Generate the Prisma client and create the local SQLite database:

```sh
npm run prisma:migrate -- --name init
```

Run locally in development:

```sh
npm run dev
```

Build and run the compiled app:

```sh
npm run build
npm start
```

## Docker Compose

Create `.env` from `.env.example`, fill in the Discord values, then run:

```sh
docker compose up --build
```

The Compose setup stores SQLite data in the `sqlite-data` named volume at `/data/dev.db`.

## Scripts

- `npm run dev` starts the bot with `tsx`.
- `npm run build` compiles TypeScript to `dist`.
- `npm start` runs the compiled app.
- `npm run lint` runs ESLint.
- `npm run format` formats files with Prettier.
- `npm run prisma:generate` generates the Prisma client.
- `npm run prisma:migrate` runs Prisma migrations.
