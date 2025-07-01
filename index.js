const { Client, GatewayIntentBits, Partials } = require('discord.js'); require('dotenv').config();

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, ], partials: [Partials.Message, Partials.Channel, Partials.Reaction], });

// ✅ Load from .env file const controlChannelId = process.env.CONTROL_CHANNEL_ID; const targetChannelId = process.env.TARGET_CHANNEL_ID; const allowedUsers = process.env.ALLOWED_USER_IDS?.split(',') || [];

const reactionTracking = new Map();

client.on('ready', () => { console.log(✅ Bot logged in as ${client.user.tag}); });

client.on('messageCreate', async (message) => { if (message.author.bot || message.channel.id !== controlChannelId) return;

const mentionedUser = message.mentions.users.first(); if (!mentionedUser) return;

try { const targetChannel = await message.guild.channels.fetch(targetChannelId); if (!targetChannel || !targetChannel.isTextBased()) return;

const messages = await targetChannel.messages.fetch({ limit: 100 });

for (const msg of messages.values()) {
  for (const [emoji, reaction] of msg.reactions.cache) {
    const users = await reaction.users.fetch();
    if (!users.has(mentionedUser.id)) continue;

    for (const [userId, reactingUser] of users) {
      if (reactingUser.bot || reactingUser.id === mentionedUser.id) continue;

      const messageLink = `https://discord.com/channels/${message.guild.id}/${msg.channel.id}/${msg.id}`;
      const controlText = `P ${reactingUser.id}\n@${mentionedUser.username} reacted on:\n${messageLink}\n✅ = keep ❌ = delete`;

      const controlMsg = await message.channel.send(controlText);
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

} catch (err) { console.error('⚠️ Error processing reactions:', err); } });

client.on('messageReactionAdd', async (reaction, user) => { if (reaction.partial) await reaction.fetch(); if (user.bot || !['✅', '❌'].includes(reaction.emoji.name)) return;

const controlMsg = reaction.message; if (controlMsg.channel.id !== controlChannelId || !reactionTracking.has(controlMsg.id)) return;

if (!allowedUsers.includes(user.id)) { await reaction.users.remove(user.id); return; }

const { messageId, channelId, userIdToRemove } = reactionTracking.get(controlMsg.id);

try { const targetChannel = await client.channels.fetch(channelId); const msg = await targetChannel.messages.fetch(messageId);

if (reaction.emoji.name === '❌') {
  for (const [emoji, react] of msg.reactions.cache) {
    const users = await react.users.fetch();
    if (users.has(userIdToRemove)) {
      await react.users.remove(userIdToRemove);
      console.log(`❌ Removed reaction from user ${userIdToRemove}`);
    }
  }
  await controlMsg.reply(`❌ Removed <@${userIdToRemove}>'s reaction on: https://discord.com/channels/${controlMsg.guild.id}/${channelId}/${messageId}`);
} else {
  await controlMsg.reply(`✅ Kept reaction from <@${userIdToRemove}>.`);
}

reactionTracking.delete(controlMsg.id);

} catch (err) { console.error('❌ Failed to remove reaction:', err); } });

client.login(process.env.DISCORD_TOKEN);

