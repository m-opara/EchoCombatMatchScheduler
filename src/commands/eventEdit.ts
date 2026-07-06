import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import type { Command } from "./index.js";
import { eventService } from "../services/EventService.js";
import { scheduleBoardService } from "../services/ScheduleBoardService.js";
import { parseDiscordMessageReference } from "../util/discordMessageReference.js";

export const eventEditCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("event-edit")
    .setDescription("Edit a scheduled event title by message link or message id.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Discord message link or raw message id for the event.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("New event title.")
        .setMaxLength(200)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true
      });
      return;
    }

    const messageInput = interaction.options.getString("message", true);
    const title = interaction.options.getString("title", true);
    const messageRef = parseDiscordMessageReference(messageInput);

    if (!messageRef) {
      await interaction.reply({
        content: "Please provide a Discord message link or raw message id.",
        ephemeral: true
      });
      return;
    }

    if (messageRef.guildId && messageRef.guildId !== interaction.guildId) {
      await interaction.reply({
        content: "That message link points to a different server.",
        ephemeral: true
      });
      return;
    }

    let event;

    try {
      event = await eventService.updateEventTitleByMessage({
        guildId: interaction.guildId,
        messageId: messageRef.messageId,
        title
      });
    } catch (error) {
      await interaction.reply({
        content: error instanceof Error ? error.message : "Unable to update that event.",
        ephemeral: true
      });
      return;
    }

    try {
      await scheduleBoardService.refresh(interaction.client, interaction.guildId);
    } catch (error) {
      console.error("Event title was updated, but schedule board refresh failed:", error);

      await interaction.reply({
        content:
          "Event title updated, but I couldn't refresh the upcoming events board. Please check the configured upcoming channel and bot permissions.",
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: `Event title updated to **${event.title}**.`,
      allowedMentions: { parse: [] },
      ephemeral: true
    });
  }
};
