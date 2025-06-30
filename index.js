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

const allowedChannelId = '1365777368534483072'; // Replace with your actual channel ID

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

    const mentionedUser = message.mentions.users.first();
    await message.delete();
    console.log(`🗑️ Deleted message with ❌ by ${user.tag}`);

    if (!mentionedUser) {
      console.log('ℹ️ No user mentioned, no reaction cleanup needed.');
      return;
    }

    console.log(`🚮 Removing all reactions by mentioned user: ${mentionedUser.tag}`);

    const messages = await message.channel.messages.fetch({ limit: 100 });
    for (const msg of messages.values()) {
      for (const [emoji, react] of msg.reactions.cache) {
        const users = await react.users.fetch();
        if (users.has(mentionedUser.id)) {
          await react.users.remove(mentionedUser.id);
          console.log(`❌ Removed ${emoji} from ${msg.id} by ${mentionedUser.tag}`);
        }
      }
    }

  } catch (err) {
    console.error('Error during ❌ cleanup:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
