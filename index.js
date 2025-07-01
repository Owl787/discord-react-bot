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

// ✅ The channel where ❌ can be used to trigger the action
const controlChannelId = '1389308377909166110'; // e.g. #mod-delete

// ✅ The channel where reactions will be removed
const targetChannelId = '1389276377890684948'; // e.g. #submissions

// 👥 Users allowed to use ❌ to delete & trigger reaction cleanup
const allowedUsers = [
  '762245134485946399', // Replace with real user IDs
  '987654321098765432'
];

client.on('ready', () => {
  console.log(`🤖 Bot is ready: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== controlChannelId) return;

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
      message.channel.id !== controlChannelId
    ) return;

    if (!allowedUsers.includes(user.id)) {
      console.log(`⛔ Unauthorized user ${user.tag} tried to delete a message.`);
      await reaction.users.remove(user.id);
      return;
    }

    const mentionedUser = message.mentions.users.first();
    await message.delete();
    console.log(`🗑️ Deleted message via ❌ by ${user.tag}`);

    if (!mentionedUser) {
      console.log(`ℹ️ No mentioned user — skipping reaction cleanup.`);
      return;
    }

    // 🔄 Now go to the target channel and remove all reactions by mentionedUser
    const targetChannel = await message.guild.channels.fetch(targetChannelId);
    if (!targetChannel || !targetChannel.isTextBased()) {
      console.log(`❌ Cannot access target channel.`);
      return;
    }

    const messages = await targetChannel.messages.fetch({ limit: 100 });
    for (const msg of messages.values()) {
      for (const [emoji, react] of msg.reactions.cache) {
        const users = await react.users.fetch();
        if (users.has(mentionedUser.id)) {
          await react.users.remove(mentionedUser.id);
          console.log(`❌ Removed ${emoji.name} from message ${msg.id} in #${targetChannel.name}`);
        }
      }
    }

  } catch (err) {
    console.error('Error during reaction-delete workflow:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
if (message.content.trim() === '!p') {
  try {
    const targetChannel = await message.guild.channels.fetch(targetChannelId);
    if (!targetChannel || !targetChannel.isTextBased()) return;

    const messages = await targetChannel.messages.fetch({ limit: 100 });
    const userReactionMap = new Map();

    for (const msg of messages.values()) {
      for (const [emoji, reaction] of msg.reactions.cache) {
        if (emoji !== '👍' && emoji !== '👎') continue;
        const users = await reaction.users.fetch();
        users.forEach((user) => {
          if (user.bot) return;
          if (!userReactionMap.has(user.id)) {
            userReactionMap.set(user.id, { username: user.username, up: 0, down: 0 });
          }
          if (emoji === '👍') userReactionMap.get(user.id).up++;
          if (emoji === '👎') userReactionMap.get(user.id).down++;
        });
      }
    }

    if (userReactionMap.size === 0) {
      await message.reply('ℹ️ No reactions found from users.');
      return;
    }

    let report = '📊 Reaction Summary:\n';
    for (const [id, data] of userReactionMap) {
      report += `• **${data.username}** → 👍 ${data.up} | 👎 ${data.down}\n`;
    }

    await message.reply({ content: report.slice(0, 2000) }); // Discord limit
  } catch (err) {
    console.error('❌ Error in !p summary:', err);
    await message.reply('⚠️ Failed to generate reaction summary.');
  }
}
