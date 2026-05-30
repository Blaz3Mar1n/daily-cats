import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || './data/cats.db';

let db;

export async function initDb() {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Load existing DB from disk, or create fresh
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📦 Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database at', DB_PATH);
  }

  createSchema();
  save();
  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id   TEXT PRIMARY KEY,
      username     TEXT NOT NULL,
      avatar_url   TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cats (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      day          INTEGER UNIQUE NOT NULL,
      name         TEXT NOT NULL,
      title        TEXT,
      gif_url      TEXT,
      sender_id    TEXT,
      sent_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(discord_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS elo_scores (
      cat_id       INTEGER PRIMARY KEY,
      score        REAL DEFAULT 1200,
      wins         INTEGER DEFAULT 0,
      losses       INTEGER DEFAULT 0,
      FOREIGN KEY (cat_id) REFERENCES cats(id)
    )
  `);

  console.log('✅ Schema ready');
}

// Save DB to disk after every write
export function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export function getDb() {
  if (!db) throw new Error('Database not initialised — call initDb() first');
  return db;
}

// Helper: run a query and return rows as plain objects
export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run an INSERT/UPDATE/DELETE
export function run(sql, params = []) {
  db.run(sql, params);
  save();
}
