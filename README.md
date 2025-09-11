# NudeFlow

Short‑form media (video/image) streaming application (TikTok‑style) built with Express – now fully **ESM (type=module)** and integrated with the external **NudeShared** repository for a unified theme (`theme.css`) and shared logging utility (`logger.js`).

## Features (Current)


 Shared logging and theme via NudeShared. In containers, set `NUDESHARED_DIR=/app/NudeShared/src` so the app can locate `theme.css` and `logger.js` reliably.

- Node.js >= 18.18.0
- npm >= 10
- Optional: Docker / container environment using `entrypoint.sh`

## Installation

1. Clone the repository:
```bash
git clone https://github.com/gabriel20xx/NudeFlow.git
cd NudeFlow
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```bash
# Paths are relative to project root using ../
MEDIA_PATH=../media
MODELS_PATH=../models
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

Application defaults to `http://localhost:8080` (override with `PORT`).

## Media Management Overview

The application uses file-based media management with automatic scanning:
- **Directory-based organization**: Media files organized by categories in folders
- **Automatic scanning**: Periodic scanning of media directories for new content
- **In-memory caching**: Fast access to media metadata through memory cache
- **Multiple format support**: Supports various video and image formats
- **Dynamic routing**: Categories automatically become accessible routes

Media files are scanned from the configured media path and categorized based on their directory structure.

## API Endpoints (Core)

- `GET /api/routes` - Get available dynamic routes (categories)
- `GET /api/search?q=query` - Search for videos
- `GET /api/categories` - Get video categories
- `GET /api/categories/:category` - Get videos in a category
- `GET /api/saved` - Get saved videos (placeholder)
- `GET /api/profile` - Get user profile (placeholder)
- `GET /media/random/:category?` - Get random video (optionally from category)
- `GET /media/:relativePath` - Get specific media file

## Project Structure (Current)

```
NudeFlow/
├── entrypoint.sh            # Startup (syncs NudeShared theme + logger)
├── src/
│   ├── app.js               # Express server bootstrap (ESM)
│   ├── routes/
│   │   ├── views.js         # Page route handlers (EJS)
│   │   └── media.js         # Media API routes
│   ├── services/
│   │   └── mediaService.js  # File system media discovery / caching
│   ├── utils/
│   │   ├── AppUtils.js      # Generic helpers
│   │   └── logger.js        # Synced shared logger proxy
│   ├── public/
│   │   ├── css/
│   │   │   ├── theme.css    # From NudeShared
│   │   │   └── style.css    # Local styles
│   │   ├── js/              # Frontend scripts
│   │   └── views/           # EJS templates (+partials)
├── package.json             # Scripts + deps (type=module)
└── README.md
```

## Configuration

The application uses environment variables for configuration. Key settings include:

- **Server**: Port, base URL
- **Database**: SQLite database file path
- **Paths**: Media and models directory paths
- **Security**: CORS settings, file size limits
- **Features**: Enable/disable features via flags

### Environment Variables (Key)

- `PORT`: Server port (default: 8080)
- `MEDIA_PATH`: Path to media files directory (default: ../media, relative to project root)
- `MODELS_PATH`: Path to models directory (default: ../models, relative to project root)
- `BASE_URL`: Base URL for the application
- `CORS_ORIGIN`: CORS origin configuration (default: *)
- `MAX_FILE_SIZE`: Maximum file size for uploads (default: 10mb)
- `MEDIA_SCAN_INTERVAL`: Media scan interval in milliseconds (default: 300000)
- `ENABLE_DYNAMIC_ROUTES`: Enable dynamic routing (default: true)
- `ENABLE_SEARCH`: Enable search functionality (default: true)
- `ENABLE_PROFILES`: Enable profile functionality (default: true)
- `NODE_ENV`: Environment mode (development/production)

## Security / Hardening

- Input validation and sanitization
- Path traversal protection
- File type validation
- Error handling and logging
- CORS configuration

## Docker / Container Support

A Dockerfile is included for containerized deployment:

```bash
docker build -t nudeflow .
docker run -p 5000:5000 nudeflow
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License. Shared assets sourced from NudeShared may have separate licensing details.

## Support

For issues and questions, please open an issue on the GitHub repository.

## 🔐 Auth & Database

- Real auth is enabled via shared routes at `/auth` with cookie sessions.
- PostgreSQL is preferred; if unavailable, the app falls back to SQLite (`better-sqlite3`).
- On startup, migrations create a `users` table automatically.
- Configure `.env` using the provided `.env.example`. Set `SESSION_SECRET` for cookies. For Postgres, set `DATABASE_URL` or PG* vars; otherwise `SQLITE_PATH` is used.

## Static Caching & Introspection

NudeFlow adopts the shared caching tier used across services:

| Asset Type | Policy |
|------------|--------|
| `/shared/*.css` & `/shared/*.js` | `public, max-age=3600` |
| `/shared/*.(png|jpg|jpeg|gif|webp|svg)` | `public, max-age=86400, stale-while-revalidate=604800` |
| Theme CSS (`/assets/theme.css`) | `public, max-age=3600` |
| Local `public/` assets (no overrides) | default express static |

Introspection endpoint:

```
GET /__cache-policy
```

Returns current ETag mode and cache policy matrix (unauthenticated; restrict if needed in production).
Hardening Options:
- `REQUIRE_CACHE_POLICY_AUTH=true` forces an authenticated session (otherwise returns 404).
- Built‑in rate limit: 60 req/min/IP (HTTP 429 on exceed).

### Shared Helpers
NudeFlow mounts shared assets and adds the cache policy endpoint via:

```js
import { mountSharedStatic, defaultSharedCandidates, registerCachePolicyEndpoint } from '../../NudeShared/server/index.js';
mountSharedStatic(app, { candidates: defaultSharedCandidates(__dirname), logger });
registerCachePolicyEndpoint(app, { service: 'NudeFlow', getPolicies: () => ({ /* tiers */ }) });
```

Extend `getPolicies()` when introducing additional static tiers (fonts, video previews, etc.) for consistent ops visibility.
