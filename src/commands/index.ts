import { ChatInputCommandInteraction } from "discord.js";

import { pingCommand } from "./ping.js";
import { configCommand } from "./config.js";
import { scheduleCommand } from "./schedule.js";
import { eventsCommand } from "./events.js";
import { eventEditCommand } from "./eventEdit.js";
import { eventDeleteCommand } from "./eventDelete.js";

export interface Command {
  data: {
    name: string;
    toJSON(): unknown;
  };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export const commands: Command[] = [
  pingCommand,
  configCommand,
  scheduleCommand,
  eventsCommand,
  eventEditCommand,
  eventDeleteCommand
];

export const commandMap = new Map<string, Command>(
  commands.map((command) => [command.data.name, command])
);
