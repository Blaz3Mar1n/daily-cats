import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import CatMedia from '../components/CatMedia';
import styles from './Guess.module.css';

const COLORS = ['#E07A8F','#9B7FE8','#F4A261','#52B788','#378ADD','#E24B4A','#BA7517'];

function Avatar({ username, id, avatarUrl }) {
  const [imgError, setImgError] = useState(false);
  const color = COLORS[parseInt(id || '0', 10) % COLORS.length];

  if (avatarUrl && !imgError) {
    return (
      <img
        className={styles.avatarImg}
        src={avatarUrl}
        alt={username}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span className={styles.avatar} style={{ background: color }}>
      {username?.slice(0, 2).toUpperCase() || '??'}
    </span>
  );
}

function StreakBadge({ streak }) {
  if (streak < 2) return null;
  const fire = streak >= 10 ? '🔥🔥🔥' : streak >= 5 ? '🔥🔥' : '🔥';
  return (
    <div className={styles.streak}>
      {fire} {streak} in a row!
    </div>
  );
}

export default function Guess() {
  const [cat,      setCat]      = useState(null);
  const [users,    setUsers]    = useState([]);
  const [options,  setOptions]  = useState([]);
  const [answered, setAnswered] = useState(false);
  const [chosen,   setChosen]   = useState(null);
  const [correct,  setCorrect]  = useState(0);
  const [wrong,    setWrong]    = useState(0);
  const [streak,   setStreak]   = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => setError('Could not load users.'));
  }, []);

  const loadRound = useCallback(async () => {
    if (!users.length) return;
    setLoading(true);
    setAnswered(false);
    setChosen(null);
    try {
      const randomCat = await api.getRandomCat();
      setCat(randomCat);
      const others = users
        .filter(u => u.discord_id !== randomCat.sender_id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const correctUser = users.find(u => u.discord_id === randomCat.sender_id)
        || { discord_id: randomCat.sender_id, username: randomCat.sender_name };
      setOptions([...others, correctUser].sort(() => Math.random() - 0.5));
    } catch {
      setError('Could not load a cat.');
    } finally {
      setLoading(false);
    }
  }, [users]);

  useEffect(() => { if (users.length) loadRound(); }, [users]);

  function guess(user) {
    if (answered) return;
    setAnswered(true);
    setChosen(user.discord_id);
    if (user.discord_id === cat.sender_id) {
      setCorrect(c => c + 1);
      setStreak(s => {
        const next = s + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else {
      setWrong(w => w + 1);
      setStreak(0);
    }
  }

  if (error) return <div className="error-msg">😿 {error}</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.scoreRow}>
        <span className={styles.scoreChip}>✅ {correct} correct</span>
        <span className={styles.scoreChip}>❌ {wrong} wrong</span>
        {bestStreak >= 2 && (
          <span className={styles.scoreChipBest}>🏆 best: {bestStreak}</span>
        )}
      </div>

      <StreakBadge streak={streak} />

      <div className={styles.gameCard}>
        {loading || !cat ? (
          <div className={styles.loadingCat}>Loading cat...</div>
        ) : (
          <>
            <div className={styles.catImg}>
              <CatMedia url={cat.gif_url} name={cat.name} fallbackSize="4rem" />
            </div>
            <div className={styles.catName}>{cat.name}</div>
            {cat.title && <div className={styles.catTitle}>"{cat.title}"</div>}
            <div className={styles.catDay}>Day {cat.day}</div>

            <div className={styles.question}>Who sent this cat?</div>

            <div className={styles.optionsGrid}>
              {options.map(user => {
                const isCorrect = user.discord_id === cat.sender_id;
                const isChosen  = user.discord_id === chosen;
                let cls = styles.optBtn;
                if (answered && isCorrect) cls += ` ${styles.correct}`;
                else if (answered && isChosen) cls += ` ${styles.wrong}`;
                return (
                  <button key={user.discord_id} className={cls}
                    onClick={() => guess(user)} disabled={answered}>
                    <Avatar
                      username={user.username}
                      id={user.discord_id}
                      avatarUrl={user.avatar_url}
                    />
                    {user.username}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={chosen === cat.sender_id ? styles.feedbackCorrect : styles.feedbackWrong}>
                {chosen === cat.sender_id
                  ? streak >= 5 ? `🔥 ${streak} in a row! Unstoppable.`
                    : streak >= 3 ? `🔥 ${streak} in a row! You're on fire.`
                    : '🎉 Correct! You know your crew.'
                  : `❌ Nope! It was ${cat.sender_name}.`}
              </div>
            )}
            {answered && (
              <button className={styles.nextBtn} onClick={loadRound}>Next cat →</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
