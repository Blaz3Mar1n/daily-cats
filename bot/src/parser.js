export function parseMessage(content) {
  if (!content) return null;

  const match = content.trim().match(/^Day\s+(\d+)[.:]?\s*[:\s]\s*(.+)$/i);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const rest = match[2].trim();
  if (!rest) return null;

  const commaIndex = rest.indexOf(',');
  let name, title;

  if (commaIndex !== -1) {
    name  = rest.slice(0, commaIndex).trim();
    title = rest.slice(commaIndex + 1).trim();
  } else {
    name  = rest.trim();
    title = null;
  }

  if (!name) return null;
  return { day, name, title };
}

export function extractGifUrl(message) {
  // 1. Direct file attachments (uploaded GIFs/images)
  const attachment = message.attachments.first();
  if (attachment) return attachment.url;

  // 2. Embeds — this is where Tenor/Giphy links end up
  for (const embed of message.embeds) {
    // Tenor embed — the actual gif is in embed.video or embed.thumbnail
    if (embed.video?.url)          return embed.video.url;
    if (embed.video?.proxyURL)     return embed.video.proxyURL;
    if (embed.image?.url)          return embed.image.url;
    if (embed.image?.proxyURL)     return embed.image.proxyURL;
    if (embed.thumbnail?.url)      return embed.thumbnail.url;
    if (embed.thumbnail?.proxyURL) return embed.thumbnail.proxyURL;
    // Some embeds just have a direct URL to the media
    if (embed.url && isMediaUrl(embed.url)) return embed.url;
  }

  // 3. Raw URLs in message content — Tenor share links, direct image URLs
  const urlRegex = /https?:\/\/\S+/g;
  const urls = message.content?.match(urlRegex) || [];
  for (const url of urls) {
    if (isMediaUrl(url) || isTenorOrGiphy(url)) return url;
  }

  return null;
}

function isMediaUrl(url) {
  return /\.(gif|png|jpg|jpeg|webp|mp4)(\?|$)/i.test(url);
}

function isTenorOrGiphy(url) {
  return /tenor\.com|giphy\.com/i.test(url);
}
