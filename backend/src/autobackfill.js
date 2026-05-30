import { query } from './db.js';
import fs from 'fs';
import path from 'path';

const BACKUP_PATH = 'backup/cats.db';

export async function restoreFromGitHub() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_REPO;
  const DB_PATH      = process.env.DB_PATH || './data/cats.db';

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.log('⏭️  GitHub restore skipped — GITHUB_TOKEN or GITHUB_REPO not set');
    return false;
  }

  try {
    console.log('📥 Checking GitHub for backup...');

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.raw+json' } }
    );

    if (res.status === 404) {
      console.log('⚠️  No backup found on GitHub');
      return false;
    }
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());

    // Only restore if GitHub backup is larger than current db (has more data)
    const currentSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
    console.log(`📊 Current DB size: ${currentSize} bytes, GitHub backup size: ${buffer.length} bytes`);

    if (buffer.length > currentSize) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, buffer);
      console.log(`✅ Restored from GitHub backup (${buffer.length} bytes)`);
    } else {
      console.log('⏭️  Current DB is same size or larger, keeping it');
    }

    const count = query('SELECT COUNT(*) as count FROM cats')[0].count;
    console.log(`🐱 Database has ${count} cats`);
    return true;

  } catch (err) {
    console.error('❌ GitHub restore failed:', err.message);
    return false;
  }
}
