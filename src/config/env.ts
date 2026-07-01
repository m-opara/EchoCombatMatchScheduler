import "dotenv/config";

export const env = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN ?? "",
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ?? "",
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db"
};
