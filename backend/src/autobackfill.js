// On startup, if the database is empty, download the latest backup from GitHub.
// This restores the full cat archive in ~2 seconds instead of re-fetching from Discord.

import { query } from './db.js';
import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO; // e.g. "Blaz3Mar1n/daily-cats"
const BACKUP_PATH   = 'backup/cats.db';
const DB_PATH       = process.env.DB_PATH || './data/cats.db';

export async function restoreFromGitHub() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.log('⏭️  GitHub restore skipped — GITHUB_TOKEN or GITHUB_REPO not set');
    return false;
  }

  const existing = query('SELECT COUNT(*) as count FROM cats')[0];
  if (existing.count > 0) {
    console.log(`⏭️  Restore skipped — ${existing.count} cats already in database`);
    return true;
  }

  console.log('📥 Database empty — downloading backup from GitHub...');

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.raw+json' } }
    );

    if (res.status === 404) {
      console.log('⚠️  No backup found on GitHub yet — starting fresh');
      return false;
    }
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, buffer);

    const count = query('SELECT COUNT(*) as count FROM cats')[0].count;
    console.log(`✅ Restored ${count} cats from GitHub backup`);
    return true;

  } catch (err) {
    console.error('❌ GitHub restore failed:', err.message);
    return false;
  }
}
