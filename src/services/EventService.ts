import type { ScheduledEvent, ScheduledSignup } from "@prisma/client";

import { EventRepository } from "../repositories/EventRepository.js";

type EventWithSignups = ScheduledEvent & { signups: ScheduledSignup[] };

export type LeaveEventResult =
  { deleted: true; event: EventWithSignups } | { deleted: false; event: EventWithSignups };

export type DeleteEventResult = {
  event: EventWithSignups;
  staleMessageRefs: { channelId: string; messageId: string }[];
};

export class EventService {
  constructor(private readonly eventRepository = new EventRepository()) {}

  async scheduleEvent(input: {
    guildId: string;
    title: string;
    startsAt: Date;
    creatorUserId: string;
  }): Promise<EventWithSignups> {
    const event = await this.eventRepository.create({
      guildId: input.guildId,
      title: input.title,
      startsAt: input.startsAt,
      creatorUserId: input.creatorUserId
    });

    await this.eventRepository.addSignup(event.id, input.creatorUserId);

    const eventWithSignups = await this.eventRepository.getById(event.id);

    if (!eventWithSignups) {
      throw new Error("Scheduled event was created but could not be retrieved.");
    }

    return eventWithSignups;
  }

  async joinEvent(eventId: string, userId: string): Promise<EventWithSignups> {
    const existingEvent = await this.eventRepository.getById(eventId);

    if (!existingEvent) {
      throw new Error("This event no longer exists.");
    }

    try {
      await this.eventRepository.addSignup(eventId, userId);
    } catch (error) {
      await this.throwIfEventNoLongerExists(eventId);
      throw error;
    }

    const eventWithSignups = await this.eventRepository.getById(eventId);

    if (!eventWithSignups) {
      throw new Error("This event no longer exists.");
    }

    return eventWithSignups;
  }

  async leaveEvent(eventId: string, userId: string): Promise<LeaveEventResult> {
    const existingEvent = await this.eventRepository.getById(eventId);

    if (!existingEvent) {
      throw new Error("This event no longer exists.");
    }

    await this.eventRepository.removeSignup(eventId, userId);

    const remainingSignupCount = await this.eventRepository.getSignupCount(eventId);

    if (remainingSignupCount === 0) {
      try {
        await this.eventRepository.delete(eventId);
      } catch (error) {
        await this.throwIfEventNoLongerExists(eventId);
        throw error;
      }

      return { deleted: true, event: existingEvent };
    }

    const eventWithSignups = await this.eventRepository.getById(eventId);

    if (!eventWithSignups) {
      throw new Error("This event no longer exists.");
    }

    return { deleted: false, event: eventWithSignups };
  }

  async getUpcomingEvents(guildId: string) {
    return this.eventRepository.getUpcoming(guildId);
  }

  async updateEventTitleByMessage(input: {
    guildId: string;
    messageId: string;
    title: string;
  }): Promise<EventWithSignups> {
    const title = this.normalizeTitle(input.title);
    const event = await this.eventRepository.getBySignupMessageId(input.guildId, input.messageId);

    if (!event) {
      throw new Error("I couldn't find a scheduled event for that message.");
    }

    return this.eventRepository.updateTitle(event.id, title);
  }

  async deleteEventByMessage(input: { guildId: string; messageId: string }): Promise<DeleteEventResult> {
    const event = await this.eventRepository.getBySignupMessageId(input.guildId, input.messageId);

    if (!event) {
      throw new Error("I couldn't find a scheduled event for that message.");
    }

    const staleMessageRefs =
      event.signupChannelId && event.signupMessageId
        ? [
            {
              channelId: event.signupChannelId,
              messageId: event.signupMessageId
            }
          ]
        : [];

    await this.eventRepository.delete(event.id);

    return { event, staleMessageRefs };
  }

  private normalizeTitle(title: string) {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw new Error("Event title cannot be empty.");
    }

    return normalizedTitle;
  }

  private async throwIfEventNoLongerExists(eventId: string) {
    const event = await this.eventRepository.getById(eventId);

    if (!event) {
      throw new Error("This event no longer exists.");
    }
  }
}

export const eventService = new EventService();
