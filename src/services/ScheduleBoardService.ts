import { Client, ComponentType, Message, TextBasedChannel } from "discord.js";
import type { SendableChannels } from "discord.js";

import { buildEventMessage } from "../discord/eventMessage.js";
import { ConfigRepository } from "../repositories/ConfigRepository.js";
import { EventRepository } from "../repositories/EventRepository.js";
import { isDiscordUnknownMessageError } from "../util/discordErrors.js";

type UpcomingEvent = Awaited<ReturnType<EventRepository["getUpcoming"]>>[number];
type BoardChannel = TextBasedChannel & SendableChannels;
export type BoardMessageRef = {
  channelId: string;
  messageId: string;
};

export class ScheduleBoardService {
  constructor(
    private readonly eventRepository = new EventRepository(),
    private readonly configRepository = new ConfigRepository()
  ) {}

  async refresh(
    client: Client,
    guildId: string,
    knownStaleMessageRefs: BoardMessageRef[] = [],
    retryOnMissingMessage = true
  ): Promise<void> {
    const config = await this.configRepository.getByGuildId(guildId);

    if (!config?.upcomingEventsChannelId) {
      return;
    }

    const channel = await client.channels.fetch(config.upcomingEventsChannelId);

    if (!channel || !channel.isTextBased() || !channel.isSendable()) {
      return;
    }

    const now = new Date();
    const boardChannel = channel as BoardChannel;
    await this.deleteKnownBoardMessages(boardChannel, knownStaleMessageRefs);

    const events = await this.eventRepository.getUpcoming(guildId, now);
    const validMessagesByEventId = await this.fetchValidBoardMessages(boardChannel, events);
    const preserveCount = this.getPreservedPrefixCount(events, validMessagesByEventId);

    try {
      await this.editPreservedPrefix(events.slice(0, preserveCount), validMessagesByEventId);
      await this.recreateSuffix(boardChannel, events.slice(preserveCount), validMessagesByEventId);
    } catch (error) {
      if (retryOnMissingMessage && isDiscordUnknownMessageError(error)) {
        await this.refresh(client, guildId, knownStaleMessageRefs, false);
        return;
      }

      throw error;
    }

    await this.deleteKnownStaleBoardMessages(guildId, boardChannel, now);
  }

  private async fetchValidBoardMessages(channel: BoardChannel, events: UpcomingEvent[]) {
    const messagesByEventId = new Map<string, Message>();
    const usedMessageIds = new Set<string>();

    for (const event of events) {
      if (!event.signupMessageId) {
        continue;
      }

      if (event.signupChannelId && event.signupChannelId !== channel.id) {
        continue;
      }

      try {
        const message = await channel.messages.fetch(event.signupMessageId);

        if (message.channelId !== channel.id || usedMessageIds.has(message.id)) {
          continue;
        }

        messagesByEventId.set(event.id, message);
        usedMessageIds.add(message.id);
      } catch {
        // Missing or inaccessible saved messages are treated as absent.
      }
    }

    return messagesByEventId;
  }

  private getPreservedPrefixCount(
    events: UpcomingEvent[],
    validMessagesByEventId: Map<string, Message>
  ) {
    let previousCreatedAt = 0;

    for (const [index, event] of events.entries()) {
      const message = validMessagesByEventId.get(event.id);

      if (!message || message.createdTimestamp < previousCreatedAt) {
        return index;
      }

      previousCreatedAt = message.createdTimestamp;
    }

    return events.length;
  }

  private async editPreservedPrefix(
    events: UpcomingEvent[],
    validMessagesByEventId: Map<string, Message>
  ) {
    for (const event of events) {
      const message = validMessagesByEventId.get(event.id);

      if (!message) {
        continue;
      }

      await message.edit(buildEventMessage(event));

      if (event.signupChannelId !== message.channelId || event.signupMessageId !== message.id) {
        await this.eventRepository.updateSignupMessage(event.id, {
          signupChannelId: message.channelId,
          signupMessageId: message.id
        });
      }
    }
  }

  private async recreateSuffix(
    channel: BoardChannel,
    events: UpcomingEvent[],
    validMessagesByEventId: Map<string, Message>
  ) {
    for (const event of events) {
      const message = validMessagesByEventId.get(event.id);

      if (message) {
        await this.deleteMessageIfAvailable(message);
      }
    }

    for (const event of events) {
      const message = await channel.send(buildEventMessage(event));

      await this.eventRepository.updateSignupMessage(event.id, {
        signupChannelId: message.channelId,
        signupMessageId: message.id
      });
    }
  }

  private async deleteKnownStaleBoardMessages(guildId: string, channel: BoardChannel, now: Date) {
    const staleRefs = await this.eventRepository.getStaleBoardMessageRefs(guildId, channel.id, now);

    for (const staleRef of staleRefs) {
      if (!staleRef.signupMessageId) {
        continue;
      }

      try {
        const message = await channel.messages.fetch(staleRef.signupMessageId);

        if (this.isEventBoardMessage(message)) {
          await message.delete();
        }
      } catch {
        // Already deleted or inaccessible is an acceptable stale state.
      }
    }
  }

  private async deleteKnownBoardMessages(channel: BoardChannel, messageRefs: BoardMessageRef[]) {
    for (const messageRef of messageRefs) {
      if (messageRef.channelId !== channel.id) {
        continue;
      }

      try {
        const message = await channel.messages.fetch(messageRef.messageId);

        if (this.isEventBoardMessage(message)) {
          await message.delete();
        }
      } catch {
        // Already deleted or inaccessible is fine during reconciliation.
      }
    }
  }

  private async deleteMessageIfAvailable(message: Message) {
    try {
      await message.delete();
    } catch {
      // The reconciler will still send a fresh suffix message below.
    }
  }

  private isEventBoardMessage(message: Message) {
    if (message.author.id !== message.client.user?.id) {
      return false;
    }

    return message.components.some((row) => {
      if (row.type !== ComponentType.ActionRow) {
        return false;
      }

      return row.components.some(
        (component) =>
          "customId" in component &&
          typeof component.customId === "string" &&
          component.customId.startsWith("event_")
      );
    });
  }
}

export const scheduleBoardService = new ScheduleBoardService();
