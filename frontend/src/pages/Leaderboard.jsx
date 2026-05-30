import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { api } from '../api';
import styles from './Leaderboard.module.css';

const COLORS = ['#E07A8F','#9B7FE8','#F4A261','#52B788','#378ADD','#E24B4A','#BA7517'];
const MEDALS = ['🥇','🥈','🥉'];

function Avatar({ user, color, initials }) {
  const [imgError, setImgError] = useState(false);

  if (user.avatar_url && !imgError) {
    return (
      <img
        className={styles.avatarImg}
        src={user.avatar_url}
        alt={user.username}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={styles.avatar} style={{ background: color }}>{initials}</div>
  );
}

export default function Leaderboard() {
  const { data, loading, error } = useFetch(() => api.getLeaderboard());

  if (loading) return <div className="error-msg">Loading leaderboard...</div>;
  if (error)   return <div className="error-msg">😿 Could not load leaderboard.</div>;
  if (!data?.length) return <div className="error-msg">No data yet.</div>;

  const max = data[0].cat_count || 1;

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Most Cats Sent</div>
      <div className={styles.list}>
        {data.map((user, i) => {
          const color    = COLORS[i % COLORS.length];
          const initials = user.username?.slice(0, 2).toUpperCase() || '??';
          const pct      = Math.round((user.cat_count / max) * 100);
          const catNames = user.cat_names
            ? user.cat_names.split(', ').slice(0, 4)
            : [];
          const extra = user.cat_count - catNames.length;

          return (
            <div key={user.discord_id} className={styles.row}>
              <div className={styles.pos}>{MEDALS[i] || `${i + 1}`}</div>
              <Avatar user={user} color={color} initials={initials} />
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.username}>{user.username}</span>
                  <span className={styles.count}>{user.cat_count} cats</span>
                </div>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className={styles.pills}>
                  {catNames.map(name => (
                    <span key={name} className={styles.pill}>{name}</span>
                  ))}
                  {extra > 0 && <span className={styles.pill}>+{extra} more</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
