import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import DiscordAvatar from '../components/DiscordAvatar';
import CatMedia from '../components/CatMedia';
import styles from './Guess.module.css';

const COLORS = ['#E07A8F','#9B7FE8','#F4A261','#52B788','#378ADD','#E24B4A','#BA7517'];
const MEDALS = ['🥇','🥈','🥉'];

function Avatar({ username, id, avatarUrl }) {
  const [imgError, setImgError] = useState(false);
  const color = COLORS[parseInt(id || '0', 10) % COLORS.length];
  if (avatarUrl && !imgError) {
    return <img className={styles.avatarImg} src={avatarUrl} alt={username} onError={() => setImgError(true)} />;
  }
  return <span className={styles.avatar} style={{ background: color }}>{username?.slice(0, 2).toUpperCase() || '??'}</span>;
}

function StreakBadge({ streak }) {
  if (streak < 2) return null;
  const fire = streak >= 10 ? '🔥🔥🔥' : streak >= 5 ? '🔥🔥' : '🔥';
  return <div className={styles.streak}>{fire} {streak} in a row!</div>;
}

export default function Guess() {
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
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('guess_player') || '');
  const [nameSet,    setNameSet]    = useState(() => !!localStorage.getItem('guess_player'));
  const [lb,         setLb]         = useState([]);
  const [lbLoading,  setLbLoading]  = useState(false);

  // Track pending score to submit
  const pendingScore = useRef({ correct: 0, wrong: 0, bestStreak: 0 });

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => setError('Could not load users.'));
  }, []);

  // Load global leaderboard when switching to that tab
  useEffect(() => {
    if (tab === 'leaderboard') {
      setLbLoading(true);
      api.getScores('guess')
        .then(setLb)
        .catch(() => setLb([]))
        .finally(() => setLbLoading(false));
    }
  }, [tab]);

  // Submit score to backend when tab changes away from game or on unmount
  useEffect(() => {
    return () => {
      const p = pendingScore.current;
      if (nameSet && playerName && (p.correct > 0 || p.wrong > 0)) {
        api.submitScore(playerName, 'guess', p.correct, p.wrong, p.bestStreak)
          .catch(console.error);
      }
    };
  }, [nameSet, playerName]);

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

    let newStreak, newBest, isCorrect = user.discord_id === cat.sender_id;

    if (isCorrect) {
      const nc = correct + 1;
      newStreak = streak + 1;
      newBest = Math.max(bestStreak, newStreak);
      setCorrect(nc);
      setStreak(newStreak);
      setBestStreak(newBest);
      pendingScore.current.correct += 1;
      pendingScore.current.bestStreak = Math.max(pendingScore.current.bestStreak, newStreak);
    } else {
      setWrong(w => w + 1);
      setStreak(0);
      newStreak = 0;
      newBest = bestStreak;
      pendingScore.current.wrong += 1;
    }

    // Submit to backend every 5 answers
    const total = pendingScore.current.correct + pendingScore.current.wrong;
    if (nameSet && playerName && total % 5 === 0) {
      api.submitScore(playerName, 'guess',
        pendingScore.current.correct,
        pendingScore.current.wrong,
        pendingScore.current.bestStreak
      ).then(() => {
        pendingScore.current = { correct: 0, wrong: 0, bestStreak: 0 };
      }).catch(console.error);
    }
  }

  function handleSetName(e) {
    e.preventDefault();
    if (!playerName.trim()) return;
    localStorage.setItem('guess_player', playerName.trim());
    setNameSet(true);
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
          {!nameSet && (
            <form className={styles.nameForm} onSubmit={handleSetName}>
              <div className={styles.namePrompt}>Enter your name to appear on the global leaderboard</div>
              <div className={styles.nameRow}>
                <input className={styles.nameInput} placeholder="Your name..." value={playerName} onChange={e => setPlayerName(e.target.value)} />
                <button className={styles.nameBtn} type="submit">Let's go!</button>
              </div>
            </form>
          )}

          <div className={styles.scoreRow}>
            <span className={styles.scoreChip}>✅ {correct} correct</span>
            <span className={styles.scoreChip}>❌ {wrong} wrong</span>
            {bestStreak >= 2 && <span className={styles.scoreChipBest}>🏆 best: {bestStreak}</span>}
            {nameSet && <span className={styles.scoreChipName}>👤 {playerName}</span>}
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
                      <button key={user.discord_id} className={cls} onClick={() => guess(user)} disabled={answered}>
                        <DiscordAvatar username={user.username} id={user.discord_id} avatarUrl={user.avatar_url} size={26} />
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
                return (
                  <div key={entry.username} className={`${styles.lbRow} ${entry.username === playerName ? styles.lbRowMe : ''}`}>
                    <div className={styles.lbPos}>{MEDALS[i] || `${i + 1}`}</div>
                    <div className={styles.lbAvatar} style={{ background: COLORS[i % COLORS.length] }}>
                      {entry.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.lbInfo}>
                      <div className={styles.lbNameRow}>
                        <span className={styles.lbName}>{entry.username}</span>
                        {entry.username === playerName && <span className={styles.lbYou}>you</span>}
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
          <div className={styles.lbNote}>Scores sync every 5 answers · shared across all players</div>
        </div>
      )}
    </div>
  );
}
