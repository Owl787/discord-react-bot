const { Client, GatewayIntentBits, Partials } = require('discord.js'); require('dotenv').config();

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions ], partials: [Partials.Message, Partials.Channel, Partials.Reaction] });

const controlChannelId = process.env.CONTROL_CHANNEL_ID; const targetChannelId = process.env.TARGET_CHANNEL_ID; const allowedUsers = process.env.ALLOWED_USER_IDS?.split(',') || [];

const reactionTracking = new Map();

client.on('ready', () => { console.log(🤖 Bot is ready: ${client.user.tag}); });

client.on('messageCreate', async (message) => { if (message.author.bot || message.channel.id !== controlChannelId) return;

const mentionedUser = message.mentions.users.first(); if (!mentionedUser) return;

try { const targetChannel = await message.guild.channels.fetch(targetChannelId); if (!targetChannel || !targetChannel.isTextBased()) return;

const messages = await targetChannel.messages.fetch({ limit: 100 });
const processedUsers = new Set();
const reactioners = new Map();

for (const msg of messages.values()) {
  for (const [emoji, react] of msg.reactions.cache) {
    const users = await react.users.fetch();
    if (!users.has(mentionedUser.id)) continue;

    for (const [userId, reactingUser] of users) {
      if (
        reactingUser.bot ||
        reactingUser.id === mentionedUser.id ||
        processedUsers.has(reactingUser.id)
      ) continue;

      processedUsers.add(reactingUser.id);

      const messageLink = `https://discord.com/channels/${message.guild.id}/${msg.channel.id}/${msg.id}`;
      const controlText = `P <@${reactingUser.id}> reacted to <@${mentionedUser.id}>\n[Jump to Message](${messageLink})`;

      const controlMsg = await message.channel.send(controlText);
      await message.channel.send(`#p <@${reactingUser.id}>`);
      await controlMsg.react('✅');
      await controlMsg.react('❌');

      reactionTracking.set(controlMsg.id, {
        messageId: msg.id,
        channelId: msg.channel.id,
        userIdToRemove: reactingUser.id,
        reactionMessageId: controlMsg.id
      });

      if (reactioners.size < 10) {
        reactioners.set(reactingUser.id, {
          userId: reactingUser.id,
          msgId: msg.id,
          channelId: msg.channel.id
        });
      }
    }
  }
}

} catch (err) { console.error('Error scanning reactions:', err); } });

client.on('messageReactionAdd', async (reaction, user) => { try { if (reaction.partial) await reaction.fetch(); const { message } = reaction;

if (
  !['✅', '❌'].includes(reaction.emoji.name) ||
  user.bot ||
  message.channel.id !== controlChannelId ||
  !reactionTracking.has(message.id)
) return;

if (!allowedUsers.includes(user.id)) {
  console.log(`⛔ Unauthorized user ${user.tag} reacted.`);
  await reaction.users.remove(user.id);
  return;
}

const { messageId, channelId, userIdToRemove } = reactionTracking.get(message.id);
const targetChannel = await client.channels.fetch(channelId);
const msg = await targetChannel.messages.fetch(messageId);

if (reaction.emoji.name === '❌') {
  for (const [emoji, react] of msg.reactions.cache) {
    const users = await react.users.fetch();
    if (users.has(userIdToRemove)) {
      await react.users.remove(userIdToRemove);
      console.log(`❌ Removed ${emoji.name} from message ${msg.id} for user ${userIdToRemove}`);
    }
  }
  await message.reply(`❌ Removed <@${userIdToRemove}>'s reaction.`);
} else {
  await message.reply(`✅ Kept <@${userIdToRemove}>'s reaction.`);
}

reactionTracking.delete(message.id);

} catch (err) { console.error('Error handling moderation reaction:', err); } });

client.login(process.env.DISCORD_TOKEN);

