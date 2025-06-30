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

// ✅ Channel where delete action is allowed
const allowedChannelId = 'YOUR_CHANNEL_ID_HERE';

// ✅ Only these users can trigger deletion with ❌
const allowedUsers = [
  '123456789012345678', // Replace with real user IDs
  '987654321098765432'
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
      reaction.emoji.name !== '❌' ||
      user.bot ||
      message.channel.id !== allowedChannelId
    ) return;

    if (!allowedUsers.includes(user.id)) {
      console.log(`⛔ Unauthorized user ${user.tag} tried to delete a message.`);
      await reaction.users.remove(user.id); // Optionally remove ❌
      return;
    }

    const mentionedUser = message.mentions.users.first();
    await message.delete();
    console.log(`🗑️ Deleted message via ❌ by ${user.tag}`);

    if (!mentionedUser) return;

    console.log(`🧹 Removing all reactions by ${mentionedUser.tag} in all channels...`);

    // Loop through all text channels in the server
    message.guild.channels.cache
      .filter(c => c.isTextBased() && c.viewable)
      .forEach(async (channel) => {
        try {
          const msgs = await channel.messages.fetch({ limit: 50 }); // Fetch last 50 messages
          for (const msg of msgs.values()) {
            for (const [emoji, react] of msg.reactions.cache) {
              const users = await react.users.fetch();
              if (users.has(mentionedUser.id)) {
                await react.users.remove(mentionedUser.id);
                console.log(`❌ Removed ${emoji.name} from ${msg.id} in #${channel.name}`);
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Could not check channel #${channel.name}: ${err.message}`);
        }
      });

  } catch (err) {
    console.error('❌ Error in reaction handling:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
