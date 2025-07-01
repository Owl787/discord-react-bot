const { Client, GatewayIntentBits, Partials } = require('discord.js'); require('dotenv').config();

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, ], partials: [Partials.Message, Partials.Channel, Partials.Reaction], });

// SETUP const controlChannelId = '1389308377909166110'; const targetChannelId = '1389276377890684948'; const allowedUsers = ['762245134485946399', '231802655217811458'];

const reactionTracking = new Map(); // key = controlMsgId, value = { messageId, channelId, userIdToRemove }

client.on('ready', () => { console.log(✅ Bot is online as ${client.user.tag}); });

client.on('messageCreate', async (message) => { if (message.author.bot || message.channel.id !== controlChannelId) return;

const mentionedUser = message.mentions.users.first(); if (!mentionedUser) return;

const targetChannel = await message.guild.channels.fetch(targetChannelId); if (!targetChannel || !targetChannel.isTextBased()) return;

const messages = await targetChannel.messages.fetch({ limit: 100 });

for (const msg of messages.values()) { for (const [emoji, reaction] of msg.reactions.cache) { const users = await reaction.users.fetch();

if (users.has(mentionedUser.id)) {
    for (const [userId, reactingUser] of users) {
      if (reactingUser.bot || reactingUser.id === mentionedUser.id) continue;

      "P " + reactingUser.id + "\n@" + mentionedUser.username + " reacted on [this message](https://discord.com/channels/" + message.guild.id + "/" + msg.channel.id + "/" + msg.id + ")\n✅ = keep ❌ = delete this user's reaction (only in target channel)"
      );

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

} });

client.on('messageReactionAdd', async (reaction, user) => { if (reaction.partial) await reaction.fetch(); if (user.bot || !['✅', '❌'].includes(reaction.emoji.name)) return;

const controlMsg = reaction.message; if (controlMsg.channel.id !== controlChannelId || !reactionTracking.has(controlMsg.id)) return;

if (!allowedUsers.includes(user.id)) { await reaction.users.remove(user.id); return; }

const { messageId, channelId, userIdToRemove } = reactionTracking.get(controlMsg.id);

if (reaction.emoji.name === '❌') { try { if (channelId !== targetChannelId) return; // Ensure deletion only in target

const targetChannel = await client.channels.fetch(channelId);
  const msg = await targetChannel.messages.fetch(messageId);

  for (const [emoji, react] of msg.reactions.cache) {
    const users = await react.users.fetch();
    if (users.has(userIdToRemove)) {
      await react.users.remove(userIdToRemove);
      console.log(`❌ Removed reaction from user ${userIdToRemove}`);
    }
  }

  await controlMsg.reply(`❌ Removed reaction from <@${userIdToRemove}> on [message link](https://discord.com/channels/${controlMsg.guild.id}/${channelId}/${messageId})`);
} catch (err) {
  console.error('Failed to remove reaction:', err);
}

} else { await controlMsg.reply(✅ Kept reaction from <@${userIdToRemove}>.); }

reactionTracking.delete(controlMsg.id); });

client.login(process.env.DISCORD_TOKEN);

