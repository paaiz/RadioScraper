# RadioScraper 📻

A Discord bot that scrapes Indonesian radio stations from [onlineradiobox.com](https://onlineradiobox.com/id/) and streams them directly to a voice channel.

## Features

- 🔍 **Autocomplete search** — find stations by name instantly
- 📄 **Paginated browser** — browse all stations with a select menu
- 🎛️ **Interactive control panel** — pause, resume, stop, switch station, and adjust volume without leaving chat
- 💾 **Persistent database** — scraped stations are saved locally and survive bot restarts
- 🔄 **Auto-refresh** — station list is updated automatically on startup

## Commands

| Command | Description |
|---|---|
| `/play list` | Browse all radio stations with a paginated select menu |
| `/play station name:<query>` | Search and play a station directly (with autocomplete) |
| `/stop` | Stop the current playback and disconnect from voice |
| `/nowplaying` | Show info about the currently playing station |
| `/radio [page]` | Scrape and update the station database from a specific page (Owner only) |

## Control Panel

When a station is playing, an interactive control panel is sent to the channel:

```
┌────────────────────────────────────────────────────────┐
│  [Select menu] Change station...                       │
│  ◀ Stations (Blue)            Stations ▶ (Blue)        │
│  Pause (Grey)  Resume (Green)  Stop (Red)  🔉 -   🔊 + │
└────────────────────────────────────────────────────────┘
```

- **◀ / ▶ Stations** — navigate through all available stations in the select menu
- **🔉 Vol- / 🔊 Vol+** — adjust volume in 10% steps (default: 10%, range: 0%–200%)
- **Pause / Resume** — pause and resume the stream
- **Stop** — disconnect the bot from voice

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- The bot must have the following intents enabled: `Guilds`, `GuildMessages`, `MessageContent`, `GuildMembers`, `GuildVoiceStates`

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/paaiz/RadioScraper.git
   cd RadioScraper
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory

   ```env
   BOT_TOKEN=your_bot_token_here
   ```

4. Start the bot

   ```bash
   npm start
   ```

### First Run

On first run the station database (`src/assets/radio-list.json`) may be empty or minimal. Use the `/radio` command to populate it:

```
/radio        → scrape page 0 (default)
/radio page:1 → scrape page 1
/radio page:2 → scrape page 2
...
```

Each call merges new stations into the existing database without duplicates.

## Docker

### Using Docker Compose (recommended)

1. Make sure `.env` exists with your `BOT_TOKEN`

2. Build and start the container

   ```bash
   docker compose up -d --build
   ```

3. View logs

   ```bash
   docker compose logs -f
   ```

4. Stop the container

   ```bash
   docker compose down
   ```

> **Note:** `src/assets/` is mounted as a volume so the station database persists across container restarts.

### Deploying to a Remote Server via SSH

**Option 1 — Git-based (recommended)**

```bash
# On the server (first time)
git clone https://github.com/username/RadioScraper.git
cd RadioScraper
nano .env   # fill in BOT_TOKEN
docker compose up -d --build

# On subsequent updates
git pull
docker compose up -d --build
```

**Option 2 — Docker Context (deploy directly from your local machine)**

```bash
# Setup once
docker context create myserver --docker "host=ssh://user@your-server-ip"

# Deploy from local
docker --context myserver compose up -d --build
```

## Project Structure

```
src/
├── index.js              # Entry point
├── commands/
│   ├── play.js           # /play command (list & station subcommands)
│   ├── stop.js           # /stop command
│   ├── nowplaying.js     # /nowplaying command
│   └── radio.js          # /radio command (scraping)
├── events/
│   ├── clientReady.js    # Bot ready handler + auto-refresh
│   └── interaction/
│       └── interactionCreate.js  # Command & autocomplete router
├── utils/
│   ├── handler.js        # Auto-loader for commands and events
│   ├── scrape.js         # Web scraper (axios + cheerio)
│   ├── session.js        # Shared active session store
│   ├── logger.js         # Logging utility
│   └── status.js         # Bot rich presence / status rotation manager
└── assets/
    └── radio-list.json   # Local station database
```

## Dependencies

| Package | Purpose |
|---|---|
| `discord.js` | Discord bot framework |
| `@discordjs/voice` | Voice channel audio streaming |
| `axios` | HTTP requests for scraping |
| `cheerio` | HTML parser |
| `dotenv` | Environment variable loading |
| `ffmpeg-static` | Bundled FFmpeg binary for audio encoding |
| `opusscript` | Opus codec for Discord voice |
| `tweetnacl` | Voice encryption |

## Source

Station data is scraped from [https://onlineradiobox.com/id/](https://onlineradiobox.com/id/)
