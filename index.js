const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// 🔒 Only react in this channel
const allowedChannelId = 'YOUR_CHANNEL_ID_HERE';

client.on('ready', () => {
  console.log(`🤖 Bot is ready: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== allowedChannelId) return;

  try {
    await message.react('✅');
    await message.react('❌');
  } catch (err) {
    console.error('Reaction error:', err);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();

    const { message } = reaction;
    if (
      user.bot ||
      reaction.emoji.name !== '❌' ||
      message.channel.id !== allowedChannelId
    ) return;

    // 1. Delete the message that got ❌
    await message.delete();
    console.log(`🗑️ Deleted message reacted with ❌ by ${user.tag}`);

    // 2. Remove all reactions by this user in this channel
    const messages = await message.channel.messages.fetch({ limit: 100 });
    for (const msg of messages.values()) {
      for (const [emoji, react] of msg.reactions.cache) {
        const users = await react.users.fetch();
        if (users.has(user.id)) {
          await react.users.remove(user.id);
          console.log(`🚫 Removed ${user.tag}'s ${emoji} reaction on a message`);
        }
      }
    }

  } catch (err) {
    console.error('❌ Error processing ❌ reaction:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
