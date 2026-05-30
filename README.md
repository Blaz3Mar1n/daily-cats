# Daily Cats 🐾

A website + Discord bot that archives your server's daily cat GIFs.

## Structure

```
daily-cats/
├── bot/          # Discord bot — watches channel, syncs to backend
├── backend/      # Express REST API + SQLite database
└── frontend/     # React app (Vite)
```

## Quick Start

### 1. Install all dependencies
```bash
npm run install:all
```

### 2. Set up environment variables

Copy the example files and fill in your values:
```bash
cp bot/.env.example bot/.env
cp backend/.env.example backend/.env
```

**bot/.env** — needs:
- `DISCORD_TOKEN` → from discord.com/developers
- `CHANNEL_ID` → right-click channel in Discord (Developer Mode on)
- `API_SECRET` → any long random string (must match backend)
- `BACKEND_URL` → `http://localhost:3001` for local dev

**backend/.env** — needs:
- `PORT` → `3001`
- `API_SECRET` → same string as bot
- `DB_PATH` → `./data/cats.db`

### 3. Create the frontend (Vite)
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
```

### 4. Run everything locally

In three separate terminals:
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:bot

# Terminal 3
npm run dev:frontend
```

## Discord Developer Mode

To get the Channel ID:
1. Open Discord Settings → Advanced → Enable Developer Mode
2. Right-click your cat channel → Copy Channel ID
3. Paste into `bot/.env`

## How to get your Bot Token

1. Go to https://discord.com/developers/applications
2. Click "New Application" → name it (e.g. "Daily Cats Bot")
3. Go to the "Bot" tab → click "Reset Token" → copy it
4. Under "Privileged Gateway Intents", enable **Message Content Intent**
5. Go to OAuth2 → URL Generator → select `bot` scope
6. Under Bot Permissions select: Read Messages, Read Message History
7. Copy the generated URL and open it to invite the bot to your server
