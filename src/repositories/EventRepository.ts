import { ReminderType } from "@prisma/client";

import { prisma } from "../db/prisma.js";

export class EventRepository {
  async create(data: {
    guildId: string;
    title: string;
    startsAt: Date;
    creatorUserId: string;
    signupChannelId?: string;
    signupMessageId?: string;
  }) {
    return prisma.scheduledEvent.create({
      data
    });
  }

  async updateSignupMessage(
    eventId: string,
    data: {
      signupChannelId: string;
      signupMessageId: string;
    }
  ) {
    return prisma.scheduledEvent.update({
      where: { id: eventId },
      data
    });
  }

  async getById(eventId: string) {
    return prisma.scheduledEvent.findUnique({
      where: { id: eventId },
      include: {
        signups: true,
        reminderLogs: true
      }
    });
  }

  async getBySignupMessageId(guildId: string, signupMessageId: string) {
    return prisma.scheduledEvent.findFirst({
      where: {
        guildId,
        signupMessageId
      },
      include: {
        signups: true
      }
    });
  }

  async updateTitle(eventId: string, title: string) {
    return prisma.scheduledEvent.update({
      where: { id: eventId },
      data: { title },
      include: {
        signups: true
      }
    });
  }

  async getUpcoming(guildId: string, now = new Date()) {
    return prisma.scheduledEvent.findMany({
      where: {
        guildId,
        startsAt: {
          gt: now
        }
      },
      include: {
        signups: true
      },
      orderBy: {
        startsAt: "asc"
      }
    });
  }

  async getAllUpcomingForReminders(now = new Date()) {
    return prisma.scheduledEvent.findMany({
      where: {
        startsAt: {
          gt: now
        }
      },
      include: {
        signups: true,
        reminderLogs: true
      },
      orderBy: {
        startsAt: "asc"
      }
    });
  }

  async getStartedForExpiryCleanup(now = new Date()) {
    return prisma.scheduledEvent.findMany({
      where: {
        startsAt: {
          lte: now
        }
      },
      include: {
        signups: true
      },
      orderBy: {
        startsAt: "asc"
      }
    });
  }

  async getStaleBoardMessageRefs(guildId: string, channelId: string, now = new Date()) {
    return prisma.scheduledEvent.findMany({
      where: {
        guildId,
        signupChannelId: channelId,
        signupMessageId: {
          not: null
        },
        startsAt: {
          lte: now
        }
      },
      select: {
        id: true,
        signupChannelId: true,
        signupMessageId: true
      }
    });
  }

  async delete(eventId: string) {
    return prisma.scheduledEvent.delete({
      where: { id: eventId }
    });
  }

  async addSignup(eventId: string, userId: string) {
    return prisma.scheduledSignup.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      },
      create: {
        eventId,
        userId
      },
      update: {}
    });
  }

  async removeSignup(eventId: string, userId: string) {
    return prisma.scheduledSignup.deleteMany({
      where: {
        eventId,
        userId
      }
    });
  }

  async getSignupCount(eventId: string) {
    return prisma.scheduledSignup.count({
      where: { eventId }
    });
  }

  async createReminderLog(data: { eventId: string; offsetMinutes: number; type: ReminderType }) {
    return prisma.reminderLog.create({
      data
    });
  }

  async reminderLogExists(data: { eventId: string; offsetMinutes: number; type: ReminderType }) {
    const log = await prisma.reminderLog.findUnique({
      where: {
        eventId_offsetMinutes_type: data
      }
    });

    return log !== null;
  }
}
