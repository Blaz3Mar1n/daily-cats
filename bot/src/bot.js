import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { parseMessage } from './parser.js';
import { postCat, patchCatGif } from './api.js';
import { extractGifFromMessage } from './backfill.js';

const CHANNEL_ID = process.env.CHANNEL_ID;

const required = ['DISCORD_TOKEN', 'CHANNEL_ID', 'API_SECRET', 'BACKEND_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.error('❌ Missing env vars:', missing.join(', ')); process.exit(1); }

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Track pending cat posts waiting for their GIF message
// key: sender discord_id, value: { parsed, sender, avatarUrl, savedId, timestamp }
const pendingCats = new Map();

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`👂 Watching channel: ${CHANNEL_ID}`);
  console.log(`🔗 Backend: ${process.env.BACKEND_URL}`);
});

client.on('messageCreate', async (message) => {
  if (message.channelId !== CHANNEL_ID) return;
  if (message.author.bot) return;

  const sender    = message.author;
  const avatarUrl = sender.displayAvatarURL({ extension: 'png', size: 128 });

  // Check if this message is a GIF following a pending cat post
  const pending = pendingCats.get(sender.id);
  if (pending) {
    const gifUrl = extractGifFromMessage(message);
    if (gifUrl) {
      pendingCats.delete(sender.id);
      if (pending.savedId) {
        await patchCatGif(pending.savedId, gifUrl);
        //prepro
        console.log(`🖼️  Patched GIF for Day ${pending.parsed.day}: ${pending.parsed.name}`);
      }
      return;
    }
  }

  // Check if this is a new cat post
  const parsed = parseMessage(message.content);
  if (!parsed) return;

  console.log(`🐱 Detected: Day ${parsed.day} — ${parsed.name}`);

  // Save the cat immediately (without GIF)
  const result = await postCat({
    day: parsed.day, name: parsed.name, title: parsed.title,
    gif_url: null, sender_id: sender.id,
    sender_name: sender.username, avatar_url: avatarUrl,
  });

  if (result.success) {
    console.log(`✅ Saved Day ${parsed.day}: ${parsed.name} — waiting for GIF...`);
    // Store pending so the next message from this user provides the GIF
    pendingCats.set(sender.id, {
      parsed,
      savedId: result.cat.id,
      timestamp: Date.now(),
    });
    // Clear pending after 10 minutes if no GIF arrives
    setTimeout(() => pendingCats.delete(sender.id), 10 * 60 * 1000);
  }
});

client.on('error', (err) => console.error('❌ Discord client error:', err));
client.login(process.env.DISCORD_TOKEN);
