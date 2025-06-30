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

const allowedChannelId = '1365777368534483072'; // Replace with real channel ID

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
      reaction.emoji.name !== '❌' ||
      user.bot ||
      message.channel.id !== allowedChannelId
    ) return;

    // Delete the message
    await message.delete();
    console.log(`🗑️ Deleted message due to ❌ reaction by ${user.tag}`);

    // Remove ❌ reactions by the same user on other messages in the same channel
    const messages = await message.channel.messages.fetch({ limit: 50 });
    for (const msg of messages.values()) {
      const react = msg.reactions.cache.get('❌');
      if (react) {
        const users = await react.users.fetch();
        if (users.has(user.id)) {
          await react.users.remove(user.id);
          console.log(`❌ Removed ${user.tag}'s reaction from another message`);
        }
      }
    }

  } catch (err) {
    console.error('Error handling reaction:', err);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.emoji.name === '❌' && !user.bot) {
    await reaction.message.delete();
  }
});

client.login(process.env.DISCORD_TOKEN);
