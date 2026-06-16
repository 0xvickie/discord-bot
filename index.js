// const {Client} = require("discord.js-selfbot-v13");
// require("dotenv").config();

// const client = new Client(
//     {
//         checkUpdate:false
//     }
// );

// client.on("ready", () => {
//     console.log(Logged in as ${client.user.tag}!);
// });
// console.log(process.env.DISCORD_TOKEN)
// client.login(process.env.DISCORD_TOKEN)

// // ======================
// // MESSAGE MONITOR
// // ======================   

require("dotenv").config();

const {
  Client,
  GatewayIntentBits
} = require("discord.js-selfbot-v13");

const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMembers
//   ]

checkUpdate: false
});

client.once("clientReady", () => {

  console.log(`Logged in as ${client.user.tag}`);

});

const MAX_DISCORD_MESSAGE = 2000;

async function sendLong(target, text, options = {}) {
  if (!text) return;
  const chunks = [];
  while (text.length > 0) {
    if (text.length <= MAX_DISCORD_MESSAGE) {
      chunks.push(text);
      break;
    }
    let slice = text.slice(0, MAX_DISCORD_MESSAGE);
    const lastNewline = slice.lastIndexOf('\n');
    if (lastNewline > Math.floor(MAX_DISCORD_MESSAGE * 0.6)) {
      chunks.push(slice.slice(0, lastNewline));
      text = text.slice(lastNewline + 1);
    } else {
      chunks.push(slice);
      text = text.slice(MAX_DISCORD_MESSAGE);
    }
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      if (i === 0) {
        // reply when possible for the first chunk
        if (typeof target.reply === 'function') {
          await target.reply(chunk);
        } else if (typeof target.send === 'function') {
          await target.send(chunk);
        } else if (target.channel && typeof target.channel.send === 'function') {
          await target.channel.send(chunk);
        }
      } else {
        // subsequent chunks: send to channel (or target) without replying
        const channel = target.channel ? target.channel : target;
        if (channel && typeof channel.send === 'function') {
          await channel.send(chunk);
        }
      }
    } catch (sendError) {
      console.log('Failed to send Discord message:', sendError.code || sendError);
      throw sendError;
    }
  }
}

// ======================
// MEMBER JOIN MONITOR
// ======================

client.on("guildMemberAdd", async (member) => {
  try {
    // If WATCH_GUILD_ID is set, only notify for that guild
    if (process.env.WATCH_GUILD_ID && member.guild && member.guild.id !== process.env.WATCH_GUILD_ID) {
      return;
    }

    const ownerId = process.env.OWNER_ID;
    if (!ownerId) {
      console.log('OWNER_ID not set; skipping owner DM for new member');
      return;
    }

    const owner = await client.users.fetch(ownerId);

    const details = 🚨 New Member Joined\n\n +
      👤 Username:\n\`${member.user.tag}\ (select and copy)\n\n` +
      🆔 User ID:\n\`${member.user.id}\`\n\n +
      🏠 Server:\n${member.guild.name} (${member.guild.id})\n\n +
      📅 Discord Account Created:\n${member.user.createdAt}\n\n +
      📥 Joined Server At:\n${member.joinedAt}\n;

    await sendLong(owner, details);

    console.log(${member.user.tag} joined ${member.guild.name});
  } catch (error) {
    if (error && error.code === 50007) {
      console.log(Cannot DM owner ${process.env.OWNER_ID}. This user likely has DMs disabled or has blocked the bot.);
    } else {
      console.log(error);
    }
  }
});



client.login(process.env.DISCORD_TOKEN);