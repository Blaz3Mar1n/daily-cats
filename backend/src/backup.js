// Saves the current database to GitHub as backup/cats.db
// Called after every new cat is added.

import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const BACKUP_PATH  = 'backup/cats.db';
const DB_PATH      = process.env.DB_PATH || './data/cats.db';

let lastBackup = 0;
const THROTTLE_MS = 60 * 1000; // max once per minute

export async function backupToGitHub() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return;

  // Throttle — don't backup more than once per minute
  const now = Date.now();
  if (now - lastBackup < THROTTLE_MS) return;
  lastBackup = now;

  try {
    const content = fs.readFileSync(DB_PATH);
    const base64  = content.toString('base64');

    // Get current file SHA (needed to update existing file)
    let sha = null;
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // Push updated file
    const body = {
      message: `backup: update cats.db`,
      content: base64,
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (putRes.ok) {
      console.log('💾 Database backed up to GitHub');
    } else {
      const err = await putRes.json();
      console.error('❌ GitHub backup failed:', err.message);
    }
  } catch (err) {
    console.error('❌ GitHub backup error:', err.message);
  }
}
