# NudeTok

A video streaming application similar to TikTok, built with Node.js and Express with file-based media management.

## Features

- Video streaming with swipe navigation
- Dynamic category-based content
- Search functionality
- User profiles (basic implementation)
- Responsive design for mobile and desktop
- Configurable environment settings
- File-based media management with automatic scanning

## Prerequisites

- Node.js (v14 or higher)
- NPM or Yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/gabriel20xx/XXXTok.git
cd XXXTok
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. (Optional) Install dotenv for .env file support:
```bash
npm install dotenv
```

5. Edit `.env` file with your configuration:
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

The application will be available at `http://localhost:3000` (or your configured port).

## Media Management

The application uses file-based media management with automatic scanning:
- **Directory-based organization**: Media files organized by categories in folders
- **Automatic scanning**: Periodic scanning of media directories for new content
- **In-memory caching**: Fast access to media metadata through memory cache
- **Multiple format support**: Supports various video and image formats
- **Dynamic routing**: Categories automatically become accessible routes

Media files are scanned from the configured media path and categorized based on their directory structure.

## API Endpoints

- `GET /api/routes` - Get available dynamic routes (categories)
- `GET /api/search?q=query` - Search for videos
- `GET /api/categories` - Get video categories
- `GET /api/categories/:category` - Get videos in a category
- `GET /api/saved` - Get saved videos (placeholder)
- `GET /api/profile` - Get user profile (placeholder)
- `GET /media/random/:category?` - Get random video (optionally from category)
- `GET /media/:relativePath` - Get specific media file

## Directory Structure

```
XXXTok/
├── .env.example            # Environment configuration template
├── src/
│   ├── api/                # API route handlers
│   ├── controllers/        # Business logic controllers
│   ├── models/             # Database models
│   ├── public/             # Static assets (CSS, JS, images)
│   ├── routes/             # Express routes
│   ├── utils/              # Utility functions
│   ├── views/              # EJS templates
│   └── server.js           # Main server file
├── scripts/                # Utility scripts
├── logs/                   # Application logs
├── tests/                  # Test files
└── mnt/                    # Mounted media directories
```

## Configuration

The application uses environment variables for configuration. Key settings include:

- **Server**: Port, base URL
- **Database**: SQLite database file path
- **Paths**: Media and models directory paths
- **Security**: CORS settings, file size limits
- **Features**: Enable/disable features via flags

### Environment Variables

- `PORT`: Server port (default: 3000)
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

## Security Features

- Input validation and sanitization
- Path traversal protection
- File type validation
- Error handling and logging
- CORS configuration

## Docker Support

A Dockerfile is included for containerized deployment:

```bash
docker build -t xxxtok .
docker run -p 5000:5000 xxxtok
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For issues and questions, please open an issue on the GitHub repository.
