export default function CatMedia({ url, name, className, fallbackSize = '3rem' }) {
  if (!url) return <span style={{ fontSize: fallbackSize }}>🐱</span>;

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);

  if (isVideo) {
    return (
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        title={name}
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={name}
      loading="lazy"
      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
    />
  );
}
