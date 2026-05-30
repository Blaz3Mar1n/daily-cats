import { useFetch } from '../hooks/useFetch';
import { api } from '../api';
import DiscordAvatar from '../components/DiscordAvatar';
import styles from './Leaderboard.module.css';

const MEDALS = ['🥇','🥈','🥉'];

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
          const pct      = Math.round((user.cat_count / max) * 100);
          const catNames = user.cat_names ? user.cat_names.split(', ').slice(0, 4) : [];
          const extra    = user.cat_count - catNames.length;

          return (
            <div key={user.discord_id} className={styles.row}>
              <div className={styles.pos}>{MEDALS[i] || `${i + 1}`}</div>
              <DiscordAvatar
                avatarUrl={user.avatar_url}
                username={user.username}
                id={user.discord_id}
                size={40}
              />
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.username}>{user.username}</span>
                  <span className={styles.count}>{user.cat_count} cats</span>
                </div>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${pct}%` }} />
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
