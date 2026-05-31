import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import fs from 'fs';
import path from 'path';
import { initDb } from './db.js';
import { catsRouter } from './routes/cats.js';
import { eloRouter } from './routes/elo.js';
import { usersRouter } from './routes/users.js';
import { scoresRouter } from './routes/scores.js';
import { authRouter } from './routes/auth.js';
import { backupToGitHub } from './backup.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = !!process.env.RAILWAY_ENVIRONMENT;

// Trust Railway's proxy
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://daily-cats-gamma.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'cats-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth',   authRouter);
app.use('/cats',   catsRouter);
app.use('/elo',    eloRouter);
app.use('/users',  usersRouter);
app.use('/scores', scoresRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Daily Cats backend is running.',
    isProduction,
    user: req.user?.username || null,
  });
});

app.get('/proxy/avatar', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://cdn.discordapp.com/')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', response.headers.get('content-type') || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ error: 'Failed to fetch image' });
  }
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
    RAILWAY_ENV:  process.env.RAILWAY_ENVIRONMENT || 'NOT SET',
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

async function restoreBeforeInit() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_REPO;
  const DB_PATH      = process.env.DB_PATH || './data/cats.db';
  if (!GITHUB_TOKEN || !GITHUB_REPO) return;
  try {
    console.log('📥 Checking GitHub for backup...');
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/backup/cats.db`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.raw+json' } }
    );
    if (!res.ok) { console.log('⚠️  No backup found on GitHub'); return; }
    const buffer = Buffer.from(await res.arrayBuffer());
    const currentSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
    console.log(`📊 Current DB: ${currentSize} bytes, GitHub backup: ${buffer.length} bytes`);
    if (buffer.length > currentSize) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, buffer);
      console.log(`✅ Restored from GitHub backup (${buffer.length} bytes)`);
    }
  } catch (err) {
    console.error('❌ Restore failed:', err.message);
  }
}

restoreBeforeInit().then(() => {
  return initDb();
}).then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`   API_SECRET: ${process.env.API_SECRET ? '(set)' : '⚠️  NOT SET'}`);
    console.log(`   DB_PATH:    ${process.env.DB_PATH || './data/cats.db'}`);
    console.log(`   Production: ${isProduction}`);
  });
}).catch(err => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
