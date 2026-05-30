import { useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const COLORS = ['#E07A8F','#9B7FE8','#F4A261','#52B788','#378ADD','#E24B4A','#BA7517'];

export default function DiscordAvatar({ avatarUrl, username, id, size = 40, className }) {
  const [imgError, setImgError] = useState(false);

  const color = COLORS[parseInt(id || '0', 10) % COLORS.length];
  const initials = username?.slice(0, 2).toUpperCase() || '??';

  const proxiedUrl = avatarUrl
    ? `${BASE}/proxy/avatar?url=${encodeURIComponent(avatarUrl)}`
    : null;

  if (proxiedUrl && !imgError) {
    return (
      <img
        src={proxiedUrl}
        alt={username}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        className={className}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.32, color: 'white',
      flexShrink: 0,
    }} className={className}>
      {initials}
    </div>
  );
}
