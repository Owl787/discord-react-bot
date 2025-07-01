const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// 🔧 CONFIGURE THESE
const controlChannelId = '1389308377909166110'; // Where you mention the user
const targetChannelId = '1389276377890684948';   // Where reactions were made
const allowedUsers = ['762245134485946399', '231802655217811458']; // Mods who can click ✅ or ❌

const reactionTracking = new Map();

client.on('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== controlChannelId) return;

  const mentionedUser = message.mentions.users.first();
  if (!mentionedUser) return;

  const targetChannel = await message.guild.channels.fetch(targetChannelId);
  if (!targetChannel.isTextBased()) return;

  const messages = await targetChannel.messages.fetch({ limit: 100 });

  for (const msg of messages.values()) {
    for (const [emoji, reaction] of msg.reactions.cache) {
      const users = await reaction.users.fetch();
      if (!users.has(mentionedUser.id)) continue;

      for (const [userId, reactingUser] of users) {
        if (reactingUser.bot || reactingUser.id === mentionedUser.id) continue;

        const messageLink = `https://discord.com/channels/${message.guild.id}/${msg.channel.id}/${msg.id}`;
        const text = "P " + reactingUser.id + "\n@" + mentionedUser.username + " reacted on:\n" + messageLink + "\n✅ = keep ❌ = delete";

        const controlMsg = await message.channel.send(text);
        await controlMsg.react('✅');
        await controlMsg.react('❌');

        reactionTracking.set(controlMsg.id, {
          messageId: msg.id,
          channelId: msg.channel.id,
          userIdToRemove: reactingUser.id,
        });
      }
    }
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (user.bot || !['✅', '❌'].includes(reaction.emoji.name)) return;

  const controlMsg = reaction.message;
  if (controlMsg.channel.id !== controlChannelId || !reactionTracking.has(controlMsg.id)) return;

  if (!allowedUsers.includes(user.id)) {
    await reaction.users.remove(user.id);
    return;
  }

  const { messageId, channelId, userIdToRemove } = reactionTracking.get(controlMsg.id);

  if (reaction.emoji.name === '❌') {
    try {
      if (channelId !== targetChannelId) return;

      const targetChannel = await client.channels.fetch(channelId);
      const msg = await targetChannel.messages.fetch(messageId);

      for (const [emoji, react] of msg.reactions.cache) {
        const users = await react.users.fetch();
        if (users.has(userIdToRemove)) {
          await react.users.remove(userIdToRemove);
          console.log(`❌ Removed reaction from ${userIdToRemove}`);
        }
      }

      await controlMsg.reply(`❌ Removed <@${userIdToRemove}>'s reaction: https://discord.com/channels/${controlMsg.guild.id}/${channelId}/${messageId}`);
    } catch (err) {
      console.error('❌ Failed to remove reaction:', err);
    }
  } else {
    await controlMsg.reply(`✅ Kept <@${userIdToRemove}>'s reaction.`);
  }

  reactionTracking.delete(controlMsg.id);
});

client.login(process.env.DISCORD_TOKEN);
