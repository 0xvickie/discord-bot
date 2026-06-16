// const {Client} = require("discord.js-selfbot-v13");
// require("dotenv").config();

// const client = new Client(
//     {
//         checkUpdate:false
//     }
// );

// client.on("ready", () => {
//     console.log(`Logged in as ${client.user.tag}!`);
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
const EMBED_COLOR = 0xFFFF00;

async function sendWebhook(content) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('WEBHOOK_URL is not configured');
  }

  const payload = {
    embeds: [
      {
        description: content,
        color: EMBED_COLOR
      }
    ]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Webhook send failed ${response.status}: ${bodyText}`);
  }
}

async function sendToGroupDM(content) {
  const channelId = process.env.GROUP_DM_CHANNEL_ID;
  if (!channelId) {
    throw new Error('GROUP_DM_CHANNEL_ID is not configured');
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel || typeof channel.send !== 'function') {
    throw new Error('Channel not found or cannot send messages');
  }

  await channel.send(content);
}

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

  const channelTarget = target.channel ? target.channel : target;
  const useWebhook = process.env.WEBHOOK_URL && channelTarget && channelTarget.guild;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      if (useWebhook) {
        await sendWebhook(chunk);
        continue;
      }

      if (i === 0) {
        // reply when possible for the first chunk
        const embedMsg = { embeds: [{ description: chunk, color: EMBED_COLOR }] };
        if (typeof target.reply === 'function') {
          await target.reply(embedMsg);
        } else if (typeof target.send === 'function') {
          await target.send(embedMsg);
        } else if (target.channel && typeof target.channel.send === 'function') {
          await target.channel.send(embedMsg);
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

    const details = `🚨 New Member Joined\n\n` +
      `👤 Username:\`${member.user.tag}\` \n` +
      `🆔 User ID:\`${member.user.id}\`\n` +
      `🏠 Server:${member.guild.name} (${member.guild.id})\n` +
      `📅 Discord Account Created:${member.user.createdAt}\n` +
      `📥 Joined Server At:${member.joinedAt}\n\n` +
      ` \n\n` +
      `.`

    // Try group DM first
    if (process.env.GROUP_DM_CHANNEL_ID) {
      await sendToGroupDM(details);
      console.log(`${member.user.tag} joined ${member.guild.name} (group DM notification)`);
      return;
    }

    // Fallback to webhook
    if (process.env.WEBHOOK_URL) {
      await sendWebhook(details);
      console.log(`${member.user.tag} joined ${member.guild.name} (webhook notification)`);
      return;
    }

    // Fallback to owner DM
    const ownerId = process.env.OWNER_ID;
    if (!ownerId) {
      console.log('GROUP_DM_CHANNEL_ID, WEBHOOK_URL, and OWNER_ID not set; skipping notification');
      return;
    }

    const owner = await client.users.fetch(ownerId);
    await sendLong(owner, details);

    console.log(`${member.user.tag} joined ${member.guild.name}`);
  } catch (error) {
    if (error && error.code === 50007) {
      console.log(`Cannot DM owner ${process.env.OWNER_ID}. This user likely has DMs disabled or has blocked the bot.`);
    } else {
      console.log(error);
    }
  }
});



client.login(process.env.DISCORD_TOKEN);