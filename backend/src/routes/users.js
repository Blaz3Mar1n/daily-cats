import express from 'express';
import { query } from '../db.js';

export const usersRouter = express.Router();

// GET /users — all users (needed for "Who Sent It?" game options)
usersRouter.get('/', (req, res) => {
  const users = query(`
    SELECT u.*, COUNT(c.id) as cat_count
    FROM users u
    LEFT JOIN cats c ON c.sender_id = u.discord_id
    GROUP BY u.discord_id
    ORDER BY u.username
  `);
  res.json(users);
});

// GET /leaderboard — users ranked by number of cats sent
usersRouter.get('/leaderboard', (req, res) => {
  const leaderboard = query(`
    SELECT
      u.discord_id,
      u.username,
      u.avatar_url,
      COUNT(c.id) as cat_count,
      MIN(c.day) as first_day,
      MAX(c.day) as latest_day,
      GROUP_CONCAT(c.name, ', ') as cat_names
    FROM users u
    LEFT JOIN cats c ON c.sender_id = u.discord_id
    GROUP BY u.discord_id
    ORDER BY cat_count DESC
  `);
  res.json(leaderboard);
});
