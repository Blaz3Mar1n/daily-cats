import express from 'express';
import { query, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const catsRouter = express.Router();

// GET /cats — all cats, optional ?search= and ?limit= ?offset=
catsRouter.get('/', (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT c.*, u.username as sender_name, u.avatar_url,
           e.score as elo_score
    FROM cats c
    LEFT JOIN users u ON c.sender_id = u.discord_id
    LEFT JOIN elo_scores e ON c.id = e.cat_id
  `;
  const params = [];

  if (search) {
    sql += ` WHERE (c.name LIKE ? OR c.title LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY c.day DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const cats = query(sql, params);
  const total = query(`SELECT COUNT(*) as count FROM cats`)[0].count;

  res.json({ cats, total, limit: Number(limit), offset: Number(offset) });
});

// GET /cats/random — random cat for games
catsRouter.get('/random', (req, res) => {
  const cats = query(`
    SELECT c.*, u.username as sender_name
    FROM cats c
    LEFT JOIN users u ON c.sender_id = u.discord_id
    ORDER BY RANDOM() LIMIT 1
  `);
  if (!cats.length) return res.status(404).json({ error: 'No cats yet' });
  res.json(cats[0]);
});

// GET /cats/:id — single cat
catsRouter.get('/:id', (req, res) => {
  const cats = query(`
    SELECT c.*, u.username as sender_name, u.avatar_url,
           e.score as elo_score, e.wins, e.losses
    FROM cats c
    LEFT JOIN users u ON c.sender_id = u.discord_id
    LEFT JOIN elo_scores e ON c.id = e.cat_id
    WHERE c.id = ?
  `, [req.params.id]);

  if (!cats.length) return res.status(404).json({ error: 'Cat not found' });
  res.json(cats[0]);
});

// POST /cats — create new cat (bot only)
catsRouter.post('/', requireAuth, (req, res) => {
  const { day, name, title, gif_url, sender_id, sender_name, avatar_url } = req.body;

  if (!day || !name) {
    return res.status(400).json({ error: 'day and name are required' });
  }

  // Upsert the sender into users table
  if (sender_id && sender_name) {
    run(`
      INSERT INTO users (discord_id, username, avatar_url)
      VALUES (?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET username=excluded.username, avatar_url=excluded.avatar_url
    `, [sender_id, sender_name, avatar_url || null]);
  }

  // Check if this day already exists
  const existing = query(`SELECT * FROM cats WHERE day = ?`, [day]);
  if (existing.length) {
    return res.status(409).json({ error: `Day ${day} already exists`, ...existing[0] });
  }

  // Insert cat
  run(`
    INSERT INTO cats (day, name, title, gif_url, sender_id)
    VALUES (?, ?, ?, ?, ?)
  `, [day, name, title || null, gif_url || null, sender_id || null]);

  // Get the new cat's id
  const newCat = query(`SELECT * FROM cats WHERE day = ?`, [day])[0];

  // Initialise ELO score for this cat
  run(`INSERT INTO elo_scores (cat_id, score, wins, losses) VALUES (?, 1200, 0, 0)`, [newCat.id]);

  console.log(`🐱 New cat added: Day ${day} — ${name}`);
  res.status(201).json(newCat);
});

// PATCH /cats/:id — update gif_url on an existing cat (used by re-backfill)
catsRouter.patch('/:id', requireAuth, (req, res) => {
  const { gif_url } = req.body;
  if (!gif_url) return res.status(400).json({ error: 'gif_url is required' });

  run(`UPDATE cats SET gif_url = ? WHERE id = ?`, [gif_url, req.params.id]);
  const updated = query(`SELECT * FROM cats WHERE id = ?`, [req.params.id])[0];
  if (!updated) return res.status(404).json({ error: 'Cat not found' });

  res.json(updated);
});
