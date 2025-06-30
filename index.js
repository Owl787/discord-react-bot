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

// 👇 Only allow reactions in this channel
const allowedChannelId = 'YOUR_CHANNEL_ID_HERE';

// 👥 List of allowed users who can delete messages using ❌
const allowedUsers = [
  '123456789012345678', // Replace with actual user IDs
  '987654321098765432'
  // Add up to 10 users
];

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

    // 👤 Only allow specific users to delete
    if (!allowedUsers.includes(user.id)) {
      console.log(`⛔ ${user.tag} is not allowed to delete messages.`);
      // Optionally remove their ❌ reaction:
      await reaction.users.remove(user.id);
      return;
    }

    const mentionedUser = message.mentions.users.first();
    await message.delete();
    console.log(`🗑️ Message deleted with ❌ by authorized user ${user.tag}`);

    if (!mentionedUser) return;

    // Remove all past reactions by the mentioned user
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
    console.error('Error in ❌ handling:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
