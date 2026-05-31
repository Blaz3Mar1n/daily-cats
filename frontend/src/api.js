const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  getCats:        (search = '', offset = 0, limit = 50) =>
    get(`/cats?search=${encodeURIComponent(search)}&offset=${offset}&limit=${limit}`),
  getCat:         (id) => get(`/cats/${id}`),
  getRandomCat:   ()   => get('/cats/random'),

  getElo:         ()   => get('/elo'),
  vote:           (winner_id, loser_id) => post('/elo/vote', { winner_id, loser_id }),

  getUsers:       ()   => get('/users'),
  getLeaderboard: ()   => get('/users/leaderboard'),

  getScores:      (game = 'guess') => get(`/scores/leaderboard?game=${game}`),
  submitScore:    (username, discord_id, game, correct, wrong, best_streak) =>
    post('/scores', { username, discord_id, game, correct, wrong, best_streak }),
};
