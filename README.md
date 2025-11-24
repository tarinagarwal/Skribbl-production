# 🎨 Skribbl - Multiplayer Drawing Game

A real-time multiplayer drawing and guessing game built with React, Node.js, Socket.IO, and SQLite Cloud.

## ✨ Features

- **Real-time Multiplayer**: Play with friends in real-time using WebSocket connections
- **Drawing Canvas**: Smooth drawing experience with multiple colors and tools
- **Word Guessing**: Guess what others are drawing to earn points
- **Game Rooms**: Create or join game rooms with custom settings
- **Player Statistics**: Track your wins, scores, and performance
- **Sound Effects**: Audio feedback for game events
- **Responsive Design**: Works on desktop and mobile devices
- **Connection Status**: Visual indicators for connection state
- **Error Handling**: Graceful error recovery with error boundaries

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- SQLite Cloud account (for database)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/skribbl-production.git
cd skribbl-production
```

2. Install server dependencies:

```bash
cd server
npm install
```

3. Install client dependencies:

```bash
cd ../client
npm install
```

4. Set up environment variables:

Server (.env):

```env
SQLITECLOUD_CONNECTION_STRING=your_connection_string_here
PORT=3001
LOG_LEVEL=INFO
```

Client (.env):

```env
VITE_SERVER_URL=http://localhost:3001
```

5. Import words into database:

```bash
cd server
npm run import-words
```

6. Start the development servers:

Terminal 1 (Server):

```bash
cd server
npm run dev
```

Terminal 2 (Client):

```bash
cd client
npm run dev
```

7. Open your browser to `http://localhost:5173`

## 🐳 Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up -d
```

Access the application at `http://localhost`

## 📁 Project Structure

```
skribbl-production/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── Dockerfile
│   └── nginx.conf
├── server/                # Node.js backend
│   ├── services/         # Business logic layer
│   ├── utils/            # Utility functions
│   ├── database.js       # Database connection
│   ├── gameManager.js    # Game state management
│   ├── server.js         # Express & Socket.IO server
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🎮 How to Play

1. **Create or Join a Room**: Enter your name and either create a new room or join an existing one with a room code
2. **Wait for Players**: At least 2 players are required to start
3. **Start the Game**: The room owner can start the game when ready
4. **Draw or Guess**:
   - If you're the drawer, choose a word and draw it
   - If you're guessing, type your guesses in the chat
5. **Earn Points**: Guess correctly to earn points. Faster guesses earn more points!
6. **Win the Game**: The player with the most points after all rounds wins

## 🛠️ Technologies Used

### Frontend

- React 18
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Vite
- Lucide React (icons)

### Backend

- Node.js
- Express
- Socket.IO
- SQLite Cloud
- UUID

### DevOps

- Docker
- Docker Compose
- Nginx

## 🔧 Configuration

### Game Settings

- **Draw Time**: 30-300 seconds per turn
- **Max Rounds**: 1-10 rounds per game
- **Room Code**: 4-8 alphanumeric characters

### Server Configuration

Environment variables:

- `PORT`: Server port (default: 3001)
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARN, ERROR)
- `SQLITECLOUD_CONNECTION_STRING`: Database connection string

### Client Configuration

Environment variables:

- `VITE_SERVER_URL`: Backend server URL

## 📊 Features in Detail

### Input Validation & Sanitization

- Player names limited to 20 characters
- Chat messages limited to 200 characters
- HTML tags stripped from inputs
- Room codes validated for format

### Rate Limiting

- Join game: 5 requests per 10 seconds
- Chat messages: 10 messages per 5 seconds
- Drawing events: 100 events per second

### Security

- Input sanitization
- Rate limiting
- CORS configuration
- Secure headers (nginx)

### Performance

- Drawing data throttling
- Canvas optimization
- Memory management for drawing history
- Automatic cleanup of old games

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- None currently reported

## 📮 Support

For issues and questions, please open an issue on GitHub.

## 🎯 Roadmap

- [ ] Private rooms with passwords
- [ ] Custom word lists
- [ ] Multiple language support
- [ ] Spectator mode
- [ ] Game replays
- [ ] Advanced drawing tools (shapes, fill)
- [ ] Mobile app versions
- [ ] Tournament mode

## 👏 Acknowledgments

- Inspired by Skribbl.io
- Avatar generation by DiceBear
- Icons by Lucide

---

Made with ❤️ by the Skribbl team
