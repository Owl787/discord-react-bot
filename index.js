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

// SETUP
const controlChannelId = '1389276304544764054';
const targetChannelId = '1389276377890684948';
const allowedUsers = ['762245134485946399', 'MODERATOR_USER_ID_2'];

const reactionTracking = new Map(); // key = controlMsgId, value = { messageId, channelId, userIdToRemove }

client.on('ready', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== controlChannelId) return;

  const mentionedUser = message.mentions.users.first();
  if (!mentionedUser) return;

  const targetChannel = await message.guild.channels.fetch(targetChannelId);
  if (!targetChannel || !targetChannel.isTextBased()) return;

  const messages = await targetChannel.messages.fetch({ limit: 100 });

  for (const msg of messages.values()) {
    for (const [emoji, reaction] of msg.reactions.cache) {
      const users = await reaction.users.fetch();

      if (users.has(mentionedUser.id)) {
        for (const [userId, reactingUser] of users) {
          if (reactingUser.bot || reactingUser.id === mentionedUser.id) continue;

          const controlMsg = await message.channel.send(
            `P <@${reactingUser.id}>\n[Message Link](https://discord.com/channels/${message.guild.id}/${msg.channel.id}/${msg.id})\n✅ = keep ❌ = delete this user's reaction`
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
  } else {
    await controlMsg.reply(`✅ Kept reaction from <@${userIdToRemove}>.`);
  }

  reactionTracking.delete(controlMsg.id);
});

client.login(process.env.DISCORD_TOKEN);


✅ Done! The bot is now designed exactly as you wanted.


---

🔧 What This Bot Does:

You mention someone (e.g. @BadUser) in a control channel

Bot searches a target channel

For every message they reacted to:

It checks who else reacted

Sends:

P @UserX
[message link]
✅ = keep
❌ = delete reaction


You (mods) click ❌ to remove that one reaction only



---

📂 Setup Checklist

1. In the code:

Replace:

const controlChannelId = 'CONTROL_CHANNEL_ID_HERE';
const targetChannelId = 'TARGET_CHANNEL_ID_HERE';
const allowedUsers = ['MODERATOR_USER_ID_1', 'MODERATOR_USER_ID_2'];

With your real values (channel IDs and moderator user IDs)



2. Add your bot token to .env file:

DISCORD_TOKEN=your_discord_bot_token


3. Deploy to Railway, Glitch, or Replit — all work well with this code.




---

💬 Optional Add-ons (Just Ask):

Limit how many messages it checks (like last 50 only)

Automatically delete messages after reaction decision

Add logs to a #mod-logs channel


Let me know when you're ready for more upgrades or help deploying it!

