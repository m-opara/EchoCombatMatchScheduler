import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { ScheduledEvent, ScheduledSignup } from "@prisma/client";
import type { BaseMessageOptions } from "discord.js";

import { toDiscordUnixTimestamp } from "../util/dateTime.js";

export function buildEventMessage(
  event: ScheduledEvent & { signups: ScheduledSignup[] },
): BaseMessageOptions & { content: string } {
  const unix = toDiscordUnixTimestamp(event.startsAt);

  const signupList =
    event.signups.length > 0
      ? event.signups.map((signup) => `• <@${signup.userId}>`).join("\n")
      : "No players signed up.";

  return {
    content:
      `# :echothinking: **${event.title}**\n\n` +
      `~~--------------------------------------------------~~\n` +
      `## 🕒 <t:${unix}:F>\n` +
      `### ⏳ *<t:${unix}:R>*\n\n` +
      `~~--------------------------------------------------~~\n` +
      `**Players (${event.signups.length})**\n` +
      `${signupList}` +
      `\n‎ `,
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`event_join:${event.id}`)
          .setLabel("Join")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`event_leave:${event.id}`)
          .setLabel("Leave")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}
