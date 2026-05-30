export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token || token !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorised — invalid or missing API secret' });
  }

  next();
}
