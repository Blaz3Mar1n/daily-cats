import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import CatMedia from '../components/CatMedia';
import styles from './Guess.module.css';

const COLORS = ['#E07A8F','#9B7FE8','#F4A261','#52B788','#378ADD','#E24B4A','#BA7517'];
const MEDALS = ['🥇','🥈','🥉'];
const LS_KEY = 'guess_leaderboard';

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

function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function saveLeaderboard(lb) {
  localStorage.setItem(LS_KEY, JSON.stringify(lb));
}

function updateLeaderboard(username, avatarUrl, correct, wrong, bestStreak) {
  const lb = loadLeaderboard();
  const existing = lb.find(e => e.username === username);
  if (existing) {
    existing.correct    += correct;
    existing.wrong      += wrong;
    existing.bestStreak  = Math.max(existing.bestStreak, bestStreak);
    existing.avatarUrl   = avatarUrl;
  } else {
    lb.push({ username, avatarUrl, correct, wrong, bestStreak });
  }
  lb.sort((a, b) => b.correct - a.correct);
  saveLeaderboard(lb);
  return lb;
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
  const [tab,        setTab]        = useState('game'); // 'game' | 'leaderboard'
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('guess_player') || '');
  const [nameSet,    setNameSet]    = useState(() => !!localStorage.getItem('guess_player'));
  const [lb,         setLb]         = useState(loadLeaderboard);

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
    let newStreak = streak;
    let newBest = bestStreak;
    let newCorrect = correct;
    let newWrong = wrong;

    if (user.discord_id === cat.sender_id) {
      newCorrect = correct + 1;
      newStreak = streak + 1;
      newBest = Math.max(bestStreak, newStreak);
      setCorrect(newCorrect);
      setStreak(newStreak);
      setBestStreak(newBest);
    } else {
      newWrong = wrong + 1;
      newStreak = 0;
      setWrong(newWrong);
      setStreak(0);
    }

    // Save to leaderboard if player has a name
    if (nameSet && playerName) {
      const updated = updateLeaderboard(playerName, null, 
        user.discord_id === cat.sender_id ? 1 : 0,
        user.discord_id === cat.sender_id ? 0 : 1,
        newBest
      );
      setLb(updated);
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
      {/* Tab switcher */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'game' ? styles.tabActive : ''}`} onClick={() => setTab('game')}>🕵️ Game</button>
        <button className={`${styles.tab} ${tab === 'leaderboard' ? styles.tabActive : ''}`} onClick={() => setTab('leaderboard')}>🏆 Leaderboard</button>
      </div>

      {tab === 'game' && (
        <>
          {/* Player name prompt */}
          {!nameSet && (
            <form className={styles.nameForm} onSubmit={handleSetName}>
              <div className={styles.namePrompt}>Enter your name to appear on the leaderboard</div>
              <div className={styles.nameRow}>
                <input
                  className={styles.nameInput}
                  placeholder="Your name..."
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                />
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
                        <Avatar username={user.username} id={user.discord_id} avatarUrl={user.avatar_url} />
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
          <div className={styles.lbTitle}>Who Knows Their Crew?</div>
          {lb.length === 0 ? (
            <div className="error-msg">No scores yet — play the game first!</div>
          ) : (
            <div className={styles.lbList}>
              {lb.map((entry, i) => {
                const total = entry.correct + entry.wrong;
                const pct = total > 0 ? Math.round((entry.correct / total) * 100) : 0;
                return (
                  <div key={entry.username} className={styles.lbRow}>
                    <div className={styles.lbPos}>{MEDALS[i] || `${i + 1}`}</div>
                    <div className={styles.lbAvatar} style={{ background: COLORS[i % COLORS.length] }}>
                      {entry.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.lbInfo}>
                      <div className={styles.lbName}>{entry.username}</div>
                      <div className={styles.lbBar}>
                        <div className={styles.lbBarFill} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={styles.lbStats}>
                        {entry.correct} correct · {entry.wrong} wrong · {pct}% accuracy
                        {entry.bestStreak >= 2 && ` · 🔥 best streak: ${entry.bestStreak}`}
                      </div>
                    </div>
                    <div className={styles.lbScore}>{entry.correct}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.lbNote}>Scores are saved in your browser</div>
        </div>
      )}
    </div>
  );
}
