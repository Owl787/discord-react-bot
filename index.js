const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
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

// 🔧 SETTINGS
const controlChannelId = '1389276304544764054'; // Where you mention users
const targetChannelId = '1389276377890684948';   // Where reactions get checked
const allowedUsers = [
  '762245134485946399', // moderator 1
  '987654321098765432'  // moderator 2
];

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Store cleanup targets
const cleanupQueue = new Map();

client.on('messageCreate', async (message) => {
  if (
    message.author.bot ||
    message.channel.id !== controlChannelId ||
    message.mentions.users.size === 0
  ) return;

  const mentionedUser = message.mentions.users.first();
  const targetChannel = await message.guild.channels.fetch(targetChannelId);
  if (!targetChannel || !targetChannel.isTextBased()) return;

  const messages = await targetChannel.messages.fetch({ limit: 100 });
  const reactioners = new Set();

  for (const msg of messages.values()) {
    for (const [emoji, react] of msg.reactions.cache) {
      const users = await react.users.fetch();
      if (users.has(mentionedUser.id)) {
        users.forEach(u => {
          if (!u.bot && u.id !== mentionedUser.id) {
            reactioners.add(u.id);
          }
        });
      }
    }
  }

  if (reactioners.size === 0) {
    await message.reply(`No other users reacted to messages with @${mentionedUser.username}.`);
    return;
  }

  const mentions = [...reactioners].map(id => `<@${id}>`).join(' ');
  const reply = await message.reply({
    content: `🔍 @${mentionedUser.username} reacted on messages.\n` +
             `These users also reacted:\n${mentions}\n\n` +
             `React with ✅ to delete their reactions, ❌ to cancel.`,
  });

  await reply.react('✅');
  await reply.react('❌');

  cleanupQueue.set(reply.id, {
    mentionedUserId: mentionedUser.id,
    toRemoveIds: [...reactioners]
  });
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (user.bot) return;

  const msg = reaction.message;

  if (
    msg.channel.id !== controlChannelId ||
    !cleanupQueue.has(msg.id) ||
    !['✅', '❌'].includes(reaction.emoji.name)
  ) return;

  if (!allowedUsers.includes(user.id)) {
    await reaction.users.remove(user.id);
    return;
  }

  const action = cleanupQueue.get(msg.id);
  cleanupQueue.delete(msg.id);

  if (reaction.emoji.name === '❌') {
    await msg.reply('❌ Cleanup canceled.');
    return;
  }

  const targetChannel = await msg.guild.channels.fetch(targetChannelId);
  if (!targetChannel || !targetChannel.isTextBased()) return;

  const messages = await targetChannel.messages.fetch({ limit: 100 });
  let count = 0;

  for (const message of messages.values()) {
    for (const [emoji, react] of message.reactions.cache) {
      const users = await react.users.fetch();
      for (const uid of action.toRemoveIds) {
        if (users.has(uid)) {
          await react.users.remove(uid);
          count++;
        }
      }
    }
  }

  await msg.reply(`✅ Removed ${count} reactions by the users.`);
});

client.login(process.env.DISCORD_TOKEN);
