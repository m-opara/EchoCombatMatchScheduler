import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import type { Command } from "./index.js";
import { eventService } from "../services/EventService.js";
import { scheduleBoardService } from "../services/ScheduleBoardService.js";
import { parseDiscordMessageReference } from "../util/discordMessageReference.js";

export const eventDeleteCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("event-delete")
    .setDescription("Delete a scheduled event by message link or message id.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Discord message link or raw message id for the event.")
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

    let result;

    try {
      result = await eventService.deleteEventByMessage({
        guildId: interaction.guildId,
        messageId: messageRef.messageId
      });
    } catch (error) {
      await interaction.reply({
        content: error instanceof Error ? error.message : "Unable to delete that event.",
        ephemeral: true
      });
      return;
    }

    try {
      await scheduleBoardService.refresh(
        interaction.client,
        interaction.guildId,
        result.staleMessageRefs
      );
    } catch (error) {
      console.error("Event was deleted, but schedule board refresh failed:", error);

      await interaction.reply({
        content:
          "Event deleted, but I couldn't refresh the upcoming events board. Please check the configured upcoming channel and bot permissions.",
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: `Deleted event: **${result.event.title}**.`,
      allowedMentions: { parse: [] },
      ephemeral: true
    });
  }
};
