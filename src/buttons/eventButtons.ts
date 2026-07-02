import { ButtonInteraction } from "discord.js";

import { eventService } from "../services/EventService.js";
import {
  BoardMessageRef,
  scheduleBoardService,
} from "../services/ScheduleBoardService.js";

export async function handleEventJoinButton(
  interaction: ButtonInteraction,
  eventId: string,
) {
  await interaction.deferUpdate();

  try {
    await eventService.joinEvent(eventId, interaction.user.id);
  } catch (error) {
    await interaction.followUp({
      content:
        error instanceof Error ? error.message : "This event no longer exists.",
      ephemeral: true,
    });
  } finally {
    await refreshScheduleBoard(interaction);
  }
}

export async function handleEventLeaveButton(
  interaction: ButtonInteraction,
  eventId: string,
) {
  await interaction.deferUpdate();
  const staleMessageRefs: BoardMessageRef[] = [];

  try {
    const result = await eventService.leaveEvent(eventId, interaction.user.id);

    if (result.deleted) {
      if (result.event.signupChannelId && result.event.signupMessageId) {
        staleMessageRefs.push({
          channelId: result.event.signupChannelId,
          messageId: result.event.signupMessageId,
        });
      }

      staleMessageRefs.push({
        channelId: interaction.message.channelId,
        messageId: interaction.message.id,
      });

      await interaction.followUp({
        content:
          "You left the event. Since no players remain signed up, the event was deleted.",
        ephemeral: true,
      });
    }
  } catch (error) {
    await interaction.followUp({
      content:
        error instanceof Error ? error.message : "This event no longer exists.",
      ephemeral: true,
    });
  } finally {
    await refreshScheduleBoard(interaction, staleMessageRefs);
  }
}

async function refreshScheduleBoard(
  interaction: ButtonInteraction,
  staleMessageRefs: BoardMessageRef[] = [],
) {
  if (!interaction.guildId) {
    return;
  }

  await scheduleBoardService.refresh(
    interaction.client,
    interaction.guildId,
    staleMessageRefs,
  );
}
