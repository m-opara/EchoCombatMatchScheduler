import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import type { Command } from "./index.js";
import { eventService } from "../services/EventService.js";
import { scheduleBoardService } from "../services/ScheduleBoardService.js";
import { parseScheduledDateTime } from "../util/dateTime.js";
import { isValidTimeZone } from "../util/timezones.js";

export const scheduleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Schedule a public match.")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Event title.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("start")
        .setDescription(
          "Start time: MM-dd-yyyy h:mm AM/PM, e.g. 07-15-2026 8:00 PM.",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("timezone")
        .setDescription("IANA timezone, e.g. America/New_York.")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const title = interaction.options.getString("title", true);
    const start = interaction.options.getString("start", true);
    const timezone = interaction.options.getString("timezone", true);

    if (!isValidTimeZone(timezone)) {
      await interaction.reply({
        content: `Invalid timezone: ${timezone}`,
        ephemeral: true,
      });
      return;
    }

    let startsAt: Date;

    try {
      startsAt = parseScheduledDateTime(start, timezone);
    } catch (error) {
      await interaction.reply({
        content: error instanceof Error ? error.message : "Invalid start time.",
        ephemeral: true,
      });
      return;
    }

    await eventService.scheduleEvent({
      guildId: interaction.guildId,
      title,
      startsAt,
      creatorUserId: interaction.user.id,
    });

    await scheduleBoardService.refresh(interaction.client, interaction.guildId);

    await interaction.reply({
      content: "✅ Event created.",
      ephemeral: true,
    });
  },
};
