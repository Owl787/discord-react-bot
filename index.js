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

client.on('ready', () => {
  console.log(`🤖 Bot is ready: ${client.user.tag}`);
});

// Replace with your channel ID
const allowedChannelId = 'YOUR_CHANNEL_ID_HERE';

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.id !== allowedChannelId) return; // Only react in the chosen channel

  try {
    await message.react('✅');
    await message.react('❌');
  } catch (err) {
    console.error('Reaction error:', err);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.emoji.name === '❌' && !user.bot) {
    await reaction.message.delete();
  }
});

client.login(process.env.DISCORD_TOKEN);
