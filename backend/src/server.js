import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { catsRouter } from './routes/cats.js';
import { eloRouter } from './routes/elo.js';
import { usersRouter } from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://daily-cats-gamma.vercel.app',
  ]
}));
app.use(express.json());

app.use('/cats', catsRouter);
app.use('/elo', eloRouter);
app.use('/users', usersRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Daily Cats backend is running.' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`   API_SECRET: ${process.env.API_SECRET ? '(set)' : '⚠️  NOT SET'}`);
    console.log(`   DB_PATH:    ${process.env.DB_PATH || './data/cats.db'}`);
    console.log('');
    console.log('📡 Endpoints:');
    console.log(`   GET  /health`);
    console.log(`   GET  /cats`);
    console.log(`   GET  /cats/random`);
    console.log(`   GET  /cats/:id`);
    console.log(`   POST /cats          (auth required)`);
    console.log(`   GET  /elo`);
    console.log(`   POST /elo/vote`);
    console.log(`   GET  /users`);
    console.log(`   GET  /users/leaderboard`);
  });
}).catch(err => {
  console.error('❌ Failed to initialise database:', err);
  process.exit(1);
});
