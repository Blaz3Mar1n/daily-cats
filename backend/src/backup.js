import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const BACKUP_PATH  = 'backup/cats.db';
const DB_PATH      = process.env.DB_PATH || './data/cats.db';

export async function backupToGitHub() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.log('⏭️  Backup skipped — GITHUB_TOKEN or GITHUB_REPO not set');
    return;
  }

  try {
    const content = fs.readFileSync(DB_PATH);
    const base64  = content.toString('base64');

    // Get current file SHA if it exists
    let sha = null;
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

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
