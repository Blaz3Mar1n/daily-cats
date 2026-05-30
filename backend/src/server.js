import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { catsRouter } from './routes/cats.js';
import { eloRouter } from './routes/elo.js';
import { usersRouter } from './routes/users.js';
import { scoresRouter } from './routes/scores.js';
import { restoreFromGitHub } from './autobackfill.js';
import { backupToGitHub } from './backup.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://daily-cats-gamma.vercel.app',
  ]
}));
app.use(express.json());

app.use('/cats',   catsRouter);
app.use('/elo',    eloRouter);
app.use('/users',  usersRouter);
app.use('/scores', scoresRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Daily Cats backend is running.' });
});

app.post('/admin/backup', async (req, res) => {
  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.API_SECRET) return res.status(401).json({ error: 'Unauthorised' });
  await backupToGitHub();
  res.json({ ok: true, message: 'Backup triggered' });
});

app.get('/admin/debug', (req, res) => {
  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.API_SECRET) return res.status(401).json({ error: 'Unauthorised' });
  res.json({
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ? `set (${process.env.GITHUB_TOKEN.slice(0,8)}...)` : 'NOT SET',
    GITHUB_REPO:  process.env.GITHUB_REPO  || 'NOT SET',
    DB_PATH:      process.env.DB_PATH      || 'NOT SET',
    API_SECRET:   process.env.API_SECRET   ? 'set' : 'NOT SET',
  });
});

// 404 must be last
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

initDb().then(async () => {
  await restoreFromGitHub();
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`   API_SECRET: ${process.env.API_SECRET ? '(set)' : '⚠️  NOT SET'}`);
    console.log(`   DB_PATH:    ${process.env.DB_PATH || './data/cats.db'}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialise database:', err);
  process.exit(1);
});
