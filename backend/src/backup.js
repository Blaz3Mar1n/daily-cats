import fs from 'fs';

const BACKUP_PATH = 'backup/cats.db';

export async function backupToGitHub() {
  // Read env vars at call time, not module load time
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_REPO;
  const DB_PATH      = process.env.DB_PATH || './data/cats.db';

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.log('⏭️  Backup skipped — GITHUB_TOKEN or GITHUB_REPO not set');
    console.log('   GITHUB_TOKEN:', GITHUB_TOKEN ? '(set)' : 'MISSING');
    console.log('   GITHUB_REPO:', GITHUB_REPO ? GITHUB_REPO : 'MISSING');
    return;
  }

  console.log(`💾 Starting backup to ${GITHUB_REPO}...`);

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
      console.log('📄 Existing backup found, will update');
    } else {
      console.log('📄 No existing backup, will create new');
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
      console.log('✅ Database backed up to GitHub successfully!');
    } else {
      const err = await putRes.json();
      console.error('❌ GitHub backup failed:', JSON.stringify(err));
    }
  } catch (err) {
    console.error('❌ GitHub backup error:', err.message);
  }
}
