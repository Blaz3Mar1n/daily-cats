import express from 'express';
import { query, run } from '../db.js';

export const eloRouter = express.Router();

// GET /elo — all cats sorted by ELO score
eloRouter.get('/', (req, res) => {
  const rankings = query(`
    SELECT c.id, c.day, c.name, c.title, c.gif_url,
           u.username as sender_name,
           e.score, e.wins, e.losses,
           (e.wins + e.losses) as total_votes
    FROM elo_scores e
    JOIN cats c ON e.cat_id = c.id
    LEFT JOIN users u ON c.sender_id = u.discord_id
    ORDER BY e.score DESC
  `);
  res.json(rankings);
});

// POST /elo/vote — submit a vote, recalculate ELO
eloRouter.post('/vote', (req, res) => {
  const { winner_id, loser_id } = req.body;

  if (!winner_id || !loser_id) {
    return res.status(400).json({ error: 'winner_id and loser_id are required' });
  }
  if (winner_id === loser_id) {
    return res.status(400).json({ error: 'winner and loser must be different cats' });
  }

  const winner = query(`SELECT * FROM elo_scores WHERE cat_id = ?`, [winner_id])[0];
  const loser  = query(`SELECT * FROM elo_scores WHERE cat_id = ?`, [loser_id])[0];

  if (!winner || !loser) {
    return res.status(404).json({ error: 'One or both cats not found in ELO table' });
  }

  // ELO formula
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loser.score - winner.score) / 400));
  const expectedLoser  = 1 - expectedWinner;

  const newWinnerScore = Math.round(winner.score + K * (1 - expectedWinner));
  const newLoserScore  = Math.round(loser.score  + K * (0 - expectedLoser));

  run(`
    UPDATE elo_scores SET score = ?, wins = wins + 1
    WHERE cat_id = ?
  `, [newWinnerScore, winner_id]);

  run(`
    UPDATE elo_scores SET score = ?, losses = losses + 1
    WHERE cat_id = ?
  `, [newLoserScore, loser_id]);

  res.json({
    winner: { cat_id: winner_id, old_score: winner.score, new_score: newWinnerScore },
    loser:  { cat_id: loser_id,  old_score: loser.score,  new_score: newLoserScore  },
  });
});
