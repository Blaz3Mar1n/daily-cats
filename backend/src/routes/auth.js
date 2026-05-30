import express from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { query, run } from '../db.js';

export const authRouter = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Configure passport
passport.use(new DiscordStrategy({
  clientID:     process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL:  process.env.DISCORD_CALLBACK_URL,
  scope:        ['identify'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
      : null;

    // Upsert user in database
    run(`
      INSERT INTO users (discord_id, username, avatar_url)
      VALUES (?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET
        username   = excluded.username,
        avatar_url = excluded.avatar_url
    `, [profile.id, profile.username, avatarUrl]);

    const user = query(`SELECT * FROM users WHERE discord_id = ?`, [profile.id])[0];
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.discord_id));
passport.deserializeUser((id, done) => {
  const user = query(`SELECT * FROM users WHERE discord_id = ?`, [id])[0];
  done(null, user || null);
});

// GET /auth/discord — start OAuth flow
authRouter.get('/discord', passport.authenticate('discord'));

// GET /auth/callback — Discord redirects here
authRouter.get('/callback',
  passport.authenticate('discord', { failureRedirect: `${FRONTEND_URL}?auth=failed` }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}?auth=success`);
  }
);

// GET /auth/me — get current logged in user
authRouter.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  res.json(req.user);
});

// POST /auth/logout
authRouter.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ ok: true });
  });
});
