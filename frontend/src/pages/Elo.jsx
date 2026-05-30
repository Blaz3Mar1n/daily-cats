import { useState, useEffect } from 'react';
import { api } from '../api';
import CatMedia from '../components/CatMedia';
import styles from './Elo.module.css';

export default function Elo() {
  const [rankings, setRankings] = useState([]);
  const [matchup,  setMatchup]  = useState(null);
  const [voting,   setVoting]   = useState(false);
  const [lastVote, setLastVote] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  async function loadRankings() {
    try {
      const data = await api.getElo();
      setRankings(data);
      pickMatchup(data);
    } catch {
      setError('Could not load ELO rankings.');
    } finally {
      setLoading(false);
    }
  }

  function pickMatchup(data) {
    if (!data || data.length < 2) return;
    let a = Math.floor(Math.random() * data.length);
    let b = Math.floor(Math.random() * data.length);
    while (b === a) b = Math.floor(Math.random() * data.length);
    setMatchup([data[a], data[b]]);
    setLastVote(null);
  }

  useEffect(() => { loadRankings(); }, []);

  async function vote(winner, loser) {
    if (voting) return;
    setVoting(true);
    try {
      await api.vote(winner.id, loser.id);
      setLastVote(winner.name);
      const updated = await api.getElo();
      setRankings(updated);
      setTimeout(() => pickMatchup(updated), 1200);
    } catch {
      setError('Vote failed.');
    } finally {
      setVoting(false);
    }
  }

  const medals = ['🥇','🥈','🥉'];
  if (loading) return <div className="error-msg">Loading the arena...</div>;
  if (error)   return <div className="error-msg">😿 {error}</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.arenaTitle}>ELO Arena</div>
      <div className={styles.arenaSubtitle}>Pick your favourite. The cutest cat wins.</div>

      {matchup && (
        <div className={styles.vsRow}>
          <button
            className={`${styles.eloCard} ${voting ? styles.disabled : ''}`}
            onClick={() => vote(matchup[0], matchup[1])}
          >
            <div className={styles.imgLarge}>
              <CatMedia url={matchup[0].gif_url} name={matchup[0].name} fallbackSize="3rem" />
            </div>
            <div className={styles.eloName}>{matchup[0].name}</div>
            {matchup[0].title && <div className={styles.eloTitle}>{matchup[0].title}</div>}
            <div className={styles.eloScore}>{Math.round(matchup[0].score)} ELO</div>
          </button>

          <div className={styles.vsLabel}>vs</div>

          <button
            className={`${styles.eloCard} ${voting ? styles.disabled : ''}`}
            onClick={() => vote(matchup[1], matchup[0])}
          >
            <div className={styles.imgLarge}>
              <CatMedia url={matchup[1].gif_url} name={matchup[1].name} fallbackSize="3rem" />
            </div>
            <div className={styles.eloName}>{matchup[1].name}</div>
            {matchup[1].title && <div className={styles.eloTitle}>{matchup[1].title}</div>}
            <div className={styles.eloScore}>{Math.round(matchup[1].score)} ELO</div>
          </button>
        </div>
      )}

      {lastVote && <div className={styles.voteResult}>🏆 {lastVote} wins this round!</div>}

      <button className={styles.skipBtn} onClick={() => pickMatchup(rankings)}>skip matchup</button>

      <div className={styles.rankingsTitle}>Current Rankings</div>
      <div className={styles.rankList}>
        {rankings.slice(0, 10).map((cat, i) => (
          <div key={cat.id} className={styles.rankRow}>
            <div className={styles.rankPos}>{medals[i] || `${i + 1}`}</div>
            <div className={styles.imgSmall}>
              <CatMedia url={cat.gif_url} name={cat.name} fallbackSize="1.4rem" />
            </div>
            <div className={styles.rankInfo}>
              <div className={styles.rankName}>{cat.name}</div>
              {cat.title && <div className={styles.rankTitle}>{cat.title}</div>}
            </div>
            <div className={styles.rankRight}>
              <div className={styles.rankElo}>{Math.round(cat.score)} ELO</div>
              <div className={styles.rankRecord}>{cat.wins}W / {cat.losses}L</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
