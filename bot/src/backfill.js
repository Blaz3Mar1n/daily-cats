import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { parseMessage } from './parser.js';
import { postCat, patchCatGif } from './api.js';

const CHANNEL_ID = process.env.CHANNEL_ID;

const required = ['DISCORD_TOKEN', 'CHANNEL_ID', 'API_SECRET', 'BACKEND_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.error('❌ Missing env vars:', missing.join(', ')); process.exit(1); }

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

function extractGifFromMessage(msg) {
  // 1. Attachments
  const attachment = msg.attachments.first();
  if (attachment) return attachment.url;

  // 2. Embeds
  for (const embed of msg.embeds) {
    if (embed.video?.url)          return embed.video.url;
    if (embed.video?.proxyURL)     return embed.video.proxyURL;
    if (embed.image?.url)          return embed.image.url;
    if (embed.image?.proxyURL)     return embed.image.proxyURL;
    if (embed.thumbnail?.url)      return embed.thumbnail.url;
    if (embed.thumbnail?.proxyURL) return embed.thumbnail.proxyURL;
    if (embed.url)                 return embed.url;
  }

  // 3. Any URL in the message content
  const urls = msg.content?.match(/https?:\/\/\S+/g) || [];
  for (const url of urls) {
    if (/\.(gif|png|jpg|jpeg|webp|mp4)(\?|$)/i.test(url)) return url;
    if (/tenor\.com|giphy\.com|cdn\.discordapp\.com/i.test(url)) return url;
  }

  return null;
}

client.once('ready', async () => {
  console.log(`✅ Backfill bot ready as ${client.user.tag}`);
  console.log(`📥 Fetching all messages from channel ${CHANNEL_ID}...\n`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) throw new Error('Channel not found');

    // Fetch ALL messages
    let allMessages = [];
    let lastId = null;
    let page = 1;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const batch = await channel.messages.fetch(options);
      if (batch.size === 0) break;
      allMessages.push(...batch.values());
      lastId = batch.last().id;
      console.log(`📄 Page ${page}: ${batch.size} messages (total: ${allMessages.length})`);
      page++;
      await new Promise(r => setTimeout(r, 500));
    }

    // Sort oldest first
    allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    console.log(`\n📦 Total messages: ${allMessages.length}`);
    console.log('🔍 Pairing cat names with their GIF messages...\n');

    let saved = 0, gifPatched = 0, skipped = 0, failed = 0, notCat = 0;

    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      if (msg.author.bot) { notCat++; continue; }

      const parsed = parseMessage(msg.content);
      if (!parsed) { notCat++; continue; }

      // Look at the next 1-3 messages from the same author for the GIF
      let gifUrl = null;
      for (let j = i + 1; j < Math.min(i + 4, allMessages.length); j++) {
        const next = allMessages[j];
        // Stop if we hit another cat post
        if (parseMessage(next.content)) break;
        // Only look at messages from same author or close in time (within 5 minutes)
        const timeDiff = next.createdTimestamp - msg.createdTimestamp;
        if (timeDiff > 5 * 60 * 1000) break;

        const found = extractGifFromMessage(next);
        if (found) { gifUrl = found; break; }
      }

      const sender    = msg.author;
      const avatarUrl = sender.displayAvatarURL({ extension: 'png', size: 128 });

      const result = await postCat({
        day: parsed.day, name: parsed.name, title: parsed.title,
        gif_url: gifUrl, sender_id: sender.id,
        sender_name: sender.username, avatar_url: avatarUrl,
      });

      if (result.success) {
        console.log(`✅ Day ${String(parsed.day).padStart(3)}: ${parsed.name}${gifUrl ? ' 🖼️' : ' (no gif)'}`);
        saved++;
      } else if (result.skipped) {
        if (gifUrl && result.existing && !result.existing.gif_url) {
          const ok = await patchCatGif(result.existing.id, gifUrl);
          if (ok) { console.log(`🖼️  Day ${parsed.day}: patched gif`); gifPatched++; }
          else skipped++;
        } else { skipped++; }
      } else {
        console.log(`❌ Day ${parsed.day} failed`);
        failed++;
      }

      await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n=============================');
    console.log(`✅ Saved:       ${saved} new cats`);
    console.log(`🖼️  GIF patched: ${gifPatched} existing cats`);
    console.log(`⏭️  Skipped:     ${skipped} (already complete)`);
    console.log(`❌ Failed:      ${failed}`);
    console.log(`💬 Non-cat:     ${notCat}`);
    console.log('=============================\n🎉 Done!');

  } catch (err) {
    console.error('❌ Backfill error:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
