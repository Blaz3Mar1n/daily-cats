const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  // Cats
  getCats:        (search = '', offset = 0, limit = 50) =>
    get(`/cats?search=${encodeURIComponent(search)}&offset=${offset}&limit=${limit}`),
  getCat:         (id) => get(`/cats/${id}`),
  getRandomCat:   ()  => get('/cats/random'),

  // ELO
  getElo:         ()  => get('/elo'),
  vote:           (winner_id, loser_id) => post('/elo/vote', { winner_id, loser_id }),

  // Users
  getUsers:       ()  => get('/users'),
  getLeaderboard: ()  => get('/users/leaderboard'),
};
