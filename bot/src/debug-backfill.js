import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { parseMessage } from './parser.js';

const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

function extractGifFromMessage(msg) {
  const attachment = msg.attachments.first();
  if (attachment) return { url: attachment.url, source: 'attachment' };
  for (const embed of msg.embeds) {
    if (embed.video?.url)      return { url: embed.video.url, source: 'embed.video' };
    if (embed.image?.url)      return { url: embed.image.url, source: 'embed.image' };
    if (embed.thumbnail?.url)  return { url: embed.thumbnail.url, source: 'embed.thumbnail' };
    if (embed.url)             return { url: embed.url, source: 'embed.url' };
  }
  const urls = msg.content?.match(/https?:\/\/\S+/g) || [];
  for (const url of urls) {
    if (/\.(gif|png|jpg|jpeg|webp|mp4)(\?|$)/i.test(url)) return { url, source: 'content-media' };
    if (/tenor\.com|giphy\.com/i.test(url)) return { url, source: 'content-tenor' };
  }
  return null;
}

client.once('ready', async () => {
  console.log(`✅ Debug bot ready`);
  const channel = await client.channels.fetch(CHANNEL_ID);

  // Fetch 50 messages to get a good sample
  let allMessages = [];
  let lastId = null;
  for (let p = 0; p < 3; p++) {
    const opts = { limit: 100 };
    if (lastId) opts.before = lastId;
    const batch = await channel.messages.fetch(opts);
    if (!batch.size) break;
    allMessages.push(...batch.values());
    lastId = batch.last().id;
    await new Promise(r => setTimeout(r, 300));
  }
  allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const urlTypes = {};
  let found = 0, missing = 0;

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];
    if (msg.author.bot) continue;
    const parsed = parseMessage(msg.content);
    if (!parsed) continue;

    // Look at next messages for GIF
    let gif = null;
    for (let j = i + 1; j < Math.min(i + 4, allMessages.length); j++) {
      const next = allMessages[j];
      if (parseMessage(next.content)) break;
      const timeDiff = next.createdTimestamp - msg.createdTimestamp;
      if (timeDiff > 5 * 60 * 1000) break;
      gif = extractGifFromMessage(next);
      if (gif) break;
    }

    if (gif) {
      found++;
      const domain = new URL(gif.url).hostname;
      urlTypes[domain] = (urlTypes[domain] || 0) + 1;
      if (found <= 5) console.log(`Day ${parsed.day}: ${gif.source} → ${gif.url.slice(0, 80)}`);
    } else {
      missing++;
    }
  }

  console.log('\n=== URL domain breakdown ===');
  Object.entries(urlTypes).sort((a,b) => b[1]-a[1]).forEach(([d,c]) => console.log(`  ${d}: ${c}`));
  console.log(`\nFound GIFs: ${found}, Missing: ${missing}`);

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
