export type DiscordMessageReference = {
  guildId?: string;
  channelId?: string;
  messageId: string;
};

const DISCORD_MESSAGE_LINK_PATTERN =
  /^https?:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/channels\/(?<guildId>\d+)\/(?<channelId>\d+)\/(?<messageId>\d+)$/;
const DISCORD_ID_PATTERN = /^\d{17,20}$/;

export function parseDiscordMessageReference(input: string): DiscordMessageReference | null {
  const value = input.trim();

  if (DISCORD_ID_PATTERN.test(value)) {
    return { messageId: value };
  }

  const match = value.match(DISCORD_MESSAGE_LINK_PATTERN);

  if (!match?.groups) {
    return null;
  }

  return {
    guildId: match.groups.guildId,
    channelId: match.groups.channelId,
    messageId: match.groups.messageId
  };
}
