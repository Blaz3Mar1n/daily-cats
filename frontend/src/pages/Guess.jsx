import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import CatMedia from '../components/CatMedia';
import DiscordAvatar from '../components/DiscordAvatar';
import styles from './Guess.module.css';

const COLORS = ['#E07A8F','#9B7FE8','#F4A261','#52B788','#378ADD','#E24B4A','#BA7517'];
const MEDALS = ['🥇','🥈','🥉'];

function StreakBadge({ streak }) {
  if (streak < 2) return null;
  const fire = streak >= 10 ? '🔥🔥🔥' : streak >= 5 ? '🔥🔥' : '🔥';
  return <div className={styles.streak}>{fire} {streak} in a row!</div>;
}

export default function Guess() {
  const { user, login } = useAuth();
  const [cat,        setCat]        = useState(null);
  const [users,      setUsers]      = useState([]);
  const [options,    setOptions]    = useState([]);
  const [answered,   setAnswered]   = useState(false);
  const [chosen,     setChosen]     = useState(null);
  const [correct,    setCorrect]    = useState(0);
  const [wrong,      setWrong]      = useState(0);
  const [streak,     setStreak]     = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [tab,        setTab]        = useState('game');
  const [lb,         setLb]         = useState([]);
  const [lbLoading,  setLbLoading]  = useState(false);

  const pendingScore = useRef({ correct: 0, wrong: 0, bestStreak: 0 });

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => setError('Could not load users.'));
  }, []);

  useEffect(() => {
    if (tab === 'leaderboard') {
      setLbLoading(true);
      api.getScores('guess')
        .then(setLb)
        .catch(() => setLb([]))
        .finally(() => setLbLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    return () => {
      const p = pendingScore.current;
      if (user && (p.correct > 0 || p.wrong > 0)) {
        api.submitScore(user.username, user.discord_id, 'guess', p.correct, p.wrong, p.bestStreak)
          .catch(console.error);
      }
    };
  }, [user]);

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

  function guess(guessedUser) {
    if (answered) return;
    setAnswered(true);
    setChosen(guessedUser.discord_id);
    const isCorrect = guessedUser.discord_id === cat.sender_id;

    let newStreak, newBest;
    if (isCorrect) {
      newStreak = streak + 1;
      newBest = Math.max(bestStreak, newStreak);
      setCorrect(c => c + 1);
      setStreak(newStreak);
      setBestStreak(newBest);
      pendingScore.current.correct += 1;
      pendingScore.current.bestStreak = Math.max(pendingScore.current.bestStreak, newStreak);
    } else {
      newStreak = 0;
      newBest = bestStreak;
      setWrong(w => w + 1);
      setStreak(0);
      pendingScore.current.wrong += 1;
    }

    // Submit every 5 answers
    const total = pendingScore.current.correct + pendingScore.current.wrong;
    if (user && total % 5 === 0) {
      api.submitScore(user.username, user.discord_id, 'guess',
        pendingScore.current.correct,
        pendingScore.current.wrong,
        pendingScore.current.bestStreak
      ).then(() => {
        pendingScore.current = { correct: 0, wrong: 0, bestStreak: 0 };
      }).catch(console.error);
    }
  }

  if (error) return <div className="error-msg">😿 {error}</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'game' ? styles.tabActive : ''}`} onClick={() => setTab('game')}>🕵️ Game</button>
        <button className={`${styles.tab} ${tab === 'leaderboard' ? styles.tabActive : ''}`} onClick={() => setTab('leaderboard')}>🏆 Leaderboard</button>
      </div>

      {tab === 'game' && (
        <>
          {/* Login prompt if not logged in */}
          {!user && (
            <div className={styles.loginPrompt}>
              <span>Login to save your score to the global leaderboard</span>
              <button className={styles.loginPromptBtn} onClick={login}>
                Login with Discord
              </button>
            </div>
          )}

          <div className={styles.scoreRow}>
            <span className={styles.scoreChip}>✅ {correct} correct</span>
            <span className={styles.scoreChip}>❌ {wrong} wrong</span>
            {bestStreak >= 2 && <span className={styles.scoreChipBest}>🏆 best: {bestStreak}</span>}
            {user && (
              <span className={styles.scoreChipName}>
                <DiscordAvatar avatarUrl={user.avatar_url} username={user.username} id={user.discord_id} size={20} />
                {user.username}
              </span>
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
                  {options.map(u => {
                    const isCorrect = u.discord_id === cat.sender_id;
                    const isChosen  = u.discord_id === chosen;
                    let cls = styles.optBtn;
                    if (answered && isCorrect) cls += ` ${styles.correct}`;
                    else if (answered && isChosen) cls += ` ${styles.wrong}`;
                    return (
                      <button key={u.discord_id} className={cls} onClick={() => guess(u)} disabled={answered}>
                        <DiscordAvatar username={u.username} id={u.discord_id} avatarUrl={u.avatar_url} size={26} />
                        {u.username}
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
                {answered && <button className={styles.nextBtn} onClick={loadRound}>Next cat →</button>}
              </>
            )}
          </div>
        </>
      )}

      {tab === 'leaderboard' && (
        <div className={styles.lbWrap}>
          <div className={styles.lbTitle}>Global Leaderboard</div>
          {lbLoading ? (
            <div className="error-msg">Loading scores...</div>
          ) : lb.length === 0 ? (
            <div className="error-msg">No scores yet — be the first to play!</div>
          ) : (
            <div className={styles.lbList}>
              {lb.map((entry, i) => {
                const total = entry.correct + entry.wrong;
                const pct = total > 0 ? Math.round((entry.correct / total) * 100) : 0;
                const isMe = user && entry.username === user.username;
                return (
                  <div key={entry.username} className={`${styles.lbRow} ${isMe ? styles.lbRowMe : ''}`}>
                    <div className={styles.lbPos}>{MEDALS[i] || `${i + 1}`}</div>
                    <DiscordAvatar avatarUrl={entry.avatar_url} username={entry.username} id={entry.discord_id} size={36} />
                    <div className={styles.lbInfo}>
                      <div className={styles.lbNameRow}>
                        <span className={styles.lbName}>{entry.username}</span>
                        {isMe && <span className={styles.lbYou}>you</span>}
                      </div>
                      <div className={styles.lbBar}>
                        <div className={styles.lbBarFill} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={styles.lbStats}>
                        {entry.correct} correct · {pct}% accuracy
                        {entry.best_streak >= 2 && ` · 🔥 ${entry.best_streak}`}
                      </div>
                    </div>
                    <div className={styles.lbScore}>{entry.correct}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.lbNote}>Login with Discord to appear on the leaderboard</div>
        </div>
      )}
    </div>
  );
}
