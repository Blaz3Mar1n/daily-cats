import express from 'express';
import { query, run } from '../db.js';
import { backupToGitHub } from '../backup.js';

export const scoresRouter = express.Router();

// GET /scores/leaderboard?game=guess
scoresRouter.get('/leaderboard', (req, res) => {
  const { game = 'guess' } = req.query;

  const rows = query(`
    SELECT
      gs.username,
      gs.discord_id,
      u.avatar_url,
      SUM(gs.correct)     as correct,
      SUM(gs.wrong)       as wrong,
      MAX(gs.best_streak) as best_streak,
      ROUND(CAST(SUM(gs.correct) AS FLOAT) / MAX(SUM(gs.correct) + SUM(gs.wrong), 1) * 100) as accuracy
    FROM game_scores gs
    LEFT JOIN users u ON gs.discord_id = u.discord_id
    WHERE gs.game = ?
    GROUP BY gs.username
    ORDER BY correct DESC
  `, [game]);

  res.json(rows);
});

// POST /scores
scoresRouter.post('/', (req, res) => {
  const { username, discord_id, game = 'guess', correct = 0, wrong = 0, best_streak = 0 } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });

  const existing = query(
    `SELECT id, correct, wrong, best_streak FROM game_scores WHERE username = ? AND game = ?`,
    [username, game]
  );

  if (existing.length) {
    const e = existing[0];
    run(`
      UPDATE game_scores
      SET correct     = ?,
          wrong       = ?,
          best_streak = ?,
          discord_id  = ?,
          updated_at  = datetime('now')
      WHERE username = ? AND game = ?
    `, [e.correct + correct, e.wrong + wrong, Math.max(e.best_streak, best_streak), discord_id || null, username, game]);
  } else {
    run(`
      INSERT INTO game_scores (username, discord_id, game, correct, wrong, best_streak)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, discord_id || null, game, correct, wrong, best_streak]);
  }

  const updated = query(`SELECT * FROM game_scores WHERE username = ? AND game = ?`, [username, game])[0];
  backupToGitHub().catch(console.error);
  res.json(updated);
});
