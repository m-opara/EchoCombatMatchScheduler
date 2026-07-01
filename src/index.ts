import { env } from "./config/env.js";
import { createDiscordClient } from "./discord/client.js";

const client = createDiscordClient();

client.once("clientReady", (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

await client.login(env.DISCORD_TOKEN);
