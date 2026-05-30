import express from 'express';
import { query, run } from '../db.js';
import { backupToGitHub } from '../backup.js';

export const scoresRouter = express.Router();

// GET /scores/leaderboard?game=guess — global leaderboard for a game
scoresRouter.get('/leaderboard', (req, res) => {
  const { game = 'guess' } = req.query;

  const rows = query(`
    SELECT
      username,
      SUM(correct)     as correct,
      SUM(wrong)       as wrong,
      MAX(best_streak) as best_streak,
      ROUND(CAST(SUM(correct) AS FLOAT) / MAX(SUM(correct) + SUM(wrong), 1) * 100) as accuracy
    FROM game_scores
    WHERE game = ?
    GROUP BY username
    ORDER BY correct DESC
  `, [game]);

  res.json(rows);
});

// POST /scores — submit or update a player's score
scoresRouter.post('/', (req, res) => {
  const { username, game = 'guess', correct = 0, wrong = 0, best_streak = 0 } = req.body;

  if (!username) return res.status(400).json({ error: 'username is required' });

  // Check if entry exists for this player+game
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
          updated_at  = datetime('now')
      WHERE username = ? AND game = ?
    `, [
      e.correct + correct,
      e.wrong + wrong,
      Math.max(e.best_streak, best_streak),
      username, game
    ]);
  } else {
    run(`
      INSERT INTO game_scores (username, game, correct, wrong, best_streak)
      VALUES (?, ?, ?, ?, ?)
    `, [username, game, correct, wrong, best_streak]);
  }

  // Fetch updated entry
  const updated = query(
    `SELECT * FROM game_scores WHERE username = ? AND game = ?`,
    [username, game]
  )[0];

  // Backup in background
  backupToGitHub().catch(console.error);

  res.json(updated);
});
