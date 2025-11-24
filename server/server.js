import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initDatabase, checkDatabaseHealth } from "./database.js";
import GameService from "./services/GameService.js";
import RateLimiter from "./utils/rateLimiter.js";
import logger from "./utils/logger.js";
import {
  sanitizePlayerName,
  sanitizeChatMessage,
  validateRoomCode,
  validateDrawingData,
  validateGameSettings,
} from "./utils/validation.js";
import {
  sanitizeGameForPlayer,
  canPlayerSeeWord,
  filterChatMessage,
  getPlayersWhoCanSeeWord,
} from "./utils/gameSanitizer.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // For local development
      "https://localhost:5173", // For local HTTPS
      "https://skribbl-production.onrender.com",
      "https://skribbl-production-y971.onrender.com", // Your deployed backend
      /\.vercel\.app$/, // For Vercel deployments
      /\.netlify\.app$/, // For Netlify deployments
      /\.stackblitz\.io$/, // For StackBlitz
      /\.tarinagarwal\.in$/,
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// Health check endpoint for Render
app.get("/health", async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? "OK" : "UNHEALTHY",
    message: "Skribbl server is running",
    database: dbHealthy ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Basic route for testing
app.get("/", (_req, res) => {
  res.json({
    message: "Skribbl.io Server",
    status: "Running",
    endpoints: {
      health: "/health",
      leaderboard: "/api/leaderboard",
      socket: "Socket.IO connection available",
    },
  });
});

// Leaderboard API endpoint
app.get("/api/leaderboard", async (_req, res) => {
  try {
    const StatsService = (await import("./services/StatsService.js")).default;
    const statsService = new StatsService();
    const leaderboard = await statsService.getLeaderboard(10);
    res.json(leaderboard);
  } catch (error) {
    logger.error("Error fetching leaderboard", { error: error.message });
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Word count API endpoint
app.get("/api/words/count", async (_req, res) => {
  try {
    const WordService = (await import("./services/WordService.js")).default;
    const wordService = new WordService();
    const count = await wordService.getWordCount();
    res.json(count);
  } catch (error) {
    logger.error("Error fetching word count", { error: error.message });
    res.status(500).json({ error: "Failed to fetch word count" });
  }
});

// Add custom words API endpoint (admin only - would need auth in production)
app.post("/api/words/custom", async (req, res) => {
  try {
    const { words, difficulty } = req.body;

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ error: "Invalid words array" });
    }

    const WordService = (await import("./services/WordService.js")).default;
    const wordService = new WordService();
    const success = await wordService.addCustomWords(
      words,
      difficulty || "medium"
    );

    if (success) {
      res.json({ message: "Words added successfully", count: words.length });
    } else {
      res.status(500).json({ error: "Failed to add words" });
    }
  } catch (error) {
    logger.error("Error adding custom words", { error: error.message });
    res.status(500).json({ error: "Failed to add custom words" });
  }
});

// Server stats and monitoring endpoint
app.get("/api/stats", (_req, res) => {
  try {
    const activeGames = gameService.gameManager.games.size;
    const totalPlayers = Array.from(
      gameService.gameManager.games.values()
    ).reduce((sum, game) => sum + game.players.length, 0);

    const gamesByStatus = {
      waiting: 0,
      playing: 0,
      finished: 0,
    };

    for (const game of gameService.gameManager.games.values()) {
      gamesByStatus[game.status]++;
    }

    res.json({
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: "1.0.0",
      },
      games: {
        active: activeGames,
        byStatus: gamesByStatus,
      },
      players: {
        total: totalPlayers,
        average: activeGames > 0 ? (totalPlayers / activeGames).toFixed(2) : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error fetching stats", { error: error.message });
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

const gameService = new GameService();
const rateLimiter = new RateLimiter();

// Helper function to send sanitized game updates to all players
function broadcastGameUpdate(io, gameId, game) {
  if (!game) return;

  // Send personalized game state to each player
  game.players.forEach((player) => {
    const sanitizedGame = sanitizeGameForPlayer(game, player.id);
    io.to(player.id).emit("game-update", sanitizedGame);
  });
}

// Clean up rate limiter every minute
setInterval(() => {
  rateLimiter.cleanup();
}, 60000);

// Clean up old games every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [gameId, game] of gameService.gameManager.games) {
    // Remove games that have been finished for more than 1 hour with no players
    if (
      game.status === "finished" &&
      game.players.length === 0 &&
      now - game.finishedAt > 3600000
    ) {
      gameService.gameManager.games.delete(gameId);
      gameService.gameManager.clearGameTimers(gameId);
      logger.info("Cleaned up old game", { gameId });
    }
  }
}, 1800000);

// Initialize database with retry logic
async function initializeServer() {
  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    try {
      await initDatabase();
      console.log("✅ Server initialized successfully!");
      break;
    } catch (error) {
      retries++;
      console.error(
        `❌ Server initialization attempt ${retries} failed:`,
        error.message
      );

      if (retries < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error("❌ Failed to initialize server after maximum retries");
        process.exit(1);
      }
    }
  }
}

// Initialize server
initializeServer();

io.on("connection", (socket) => {
  logger.info("User connected", { socketId: socket.id });

  socket.on("join-game", async (data) => {
    // Rate limiting
    if (!rateLimiter.checkLimit(socket.id, "join-game", 5, 10000)) {
      socket.emit("error", { message: "Too many requests. Please slow down." });
      return;
    }

    const { roomCode, playerName, settings } = data;

    // Validate and sanitize inputs
    const sanitizedName = sanitizePlayerName(playerName);
    const sanitizedRoomCode = roomCode?.toUpperCase().trim();

    if (!sanitizedName) {
      socket.emit("error", { message: "Invalid player name." });
      return;
    }

    if (!validateRoomCode(sanitizedRoomCode)) {
      socket.emit("error", { message: "Invalid room code format." });
      return;
    }

    const validatedSettings = validateGameSettings(settings);

    logger.info("Player attempting to join/create room", {
      playerName: sanitizedName,
      roomCode: sanitizedRoomCode,
      socketId: socket.id,
    });

    try {
      const { game, user } = await gameService.createOrJoinGame(
        sanitizedRoomCode,
        sanitizedName,
        validatedSettings,
        socket.id
      );

      socket.join(game.id);

      logger.info("Player joined game", {
        playerName: sanitizedName,
        gameId: game.id,
      });

      socket.emit("game-joined", {
        gameId: game.id,
        roomCode: game.roomCode,
        user,
      });

      // Send sanitized game state to all players
      broadcastGameUpdate(io, game.id, game);
    } catch (error) {
      logger.error("Error joining game", {
        error: error.message,
        socketId: socket.id,
      });
      socket.emit("error", {
        message: "Failed to join game. Please try again in a moment.",
      });
    }
  });

  socket.on("start-game", async (data) => {
    const { gameId } = data;

    try {
      const startedGame = await gameService.startGame(gameId, socket.id, io);
      if (startedGame) {
        io.to(gameId).emit("game-started", startedGame);
        broadcastGameUpdate(io, gameId, startedGame);
      }
    } catch (error) {
      logger.error("Error starting game", { error: error.message });
      socket.emit("error", {
        message: error.message || "Failed to start game. Please try again.",
      });
    }
  });

  socket.on("word-select", async (data) => {
    const { gameId, word } = data;

    try {
      const game = await gameService.selectWord(gameId, word, io);
      if (game) {
        broadcastGameUpdate(io, gameId, game);
      }
    } catch (error) {
      logger.error("Error selecting word", { error: error.message });
      socket.emit("error", {
        message: "Failed to select word. Please try again.",
      });
    }
  });

  socket.on("drawing", (data) => {
    // Rate limiting for drawing events
    if (!rateLimiter.checkLimit(socket.id, "drawing", 100, 1000)) {
      return; // Silently drop excessive drawing events
    }

    const { gameId, drawingData } = data;
    const game = gameService.getGame(gameId);

    if (
      game &&
      game.currentDrawer &&
      game.currentDrawer.id === socket.id &&
      game.status === "playing"
    ) {
      // Validate drawing data
      if (!validateDrawingData(drawingData)) {
        logger.warn("Invalid drawing data received", { socketId: socket.id });
        return;
      }

      // Limit drawing data to prevent memory issues
      if (game.drawingData.length > 5000) {
        game.drawingData = game.drawingData.slice(-4000);
      }
      game.drawingData.push(drawingData);
      // Broadcast to all players in the room (including drawer for confirmation)
      io.to(gameId).emit("drawing", drawingData);
    }
  });

  socket.on("clear-canvas", (data) => {
    const { gameId } = data;
    const game = gameService.getGame(gameId);

    if (
      game &&
      game.currentDrawer &&
      game.currentDrawer.id === socket.id &&
      game.status === "playing"
    ) {
      game.drawingData = [];
      // Broadcast clear to all other players in the room
      socket.to(gameId).emit("clear-canvas");
      console.log(`Canvas cleared for room ${gameId}`);
    }
  });

  socket.on("chat-message", async (data) => {
    // Rate limiting for chat messages
    if (!rateLimiter.checkLimit(socket.id, "chat-message", 10, 5000)) {
      socket.emit("error", { message: "Sending messages too fast!" });
      return;
    }

    const { gameId, message } = data;

    try {
      const result = await gameService.processChatMessage(
        gameId,
        message,
        socket.id
      );

      if (!result) {
        return;
      }

      const { game, user, isCorrect } = result;

      if (isCorrect && user.id !== game.currentDrawer.id) {
        // Get list of players who can see the word
        const authorizedPlayers = getPlayersWhoCanSeeWord(game);

        // Send correct guess notification ONLY to authorized players
        const correctGuessMessage = {
          userId: socket.id,
          userName: user.name,
          word: game.currentWord, // Only sent to authorized players
        };

        authorizedPlayers.forEach((playerId) => {
          io.to(playerId).emit("correct-guess", correctGuessMessage);
        });

        // Check if all non-drawer players have guessed correctly
        if (gameService.gameManager.allPlayersGuessed(game)) {
          // All players guessed correctly, move to next turn after delay
          setTimeout(async () => {
            try {
              gameService.gameManager.resetGuessStatus(game);
              await gameService.gameManager.nextTurn(gameId, io);
              const updatedGame = gameService.getGame(gameId);
              if (updatedGame) {
                io.to(gameId).emit("next-turn", updatedGame);
                broadcastGameUpdate(io, gameId, updatedGame);
              }
            } catch (error) {
              logger.error("Error in next turn after all guessed", {
                error: error.message,
              });
            }
          }, 3000);
        }
      } else {
        // Filter message for players who haven't guessed
        await gameService.gameManager.saveMessage(gameId, socket.id, message);

        // Send different versions of the message based on player status
        game.players.forEach((player) => {
          const shouldSeeWord = canPlayerSeeWord(game, player.id);
          const displayMessage = shouldSeeWord
            ? message
            : filterChatMessage(message, game.currentWord);

          const chatMessage = {
            userId: socket.id,
            userName: user.name,
            message: displayMessage,
            timestamp: new Date().toISOString(),
          };

          io.to(player.id).emit("chat-message", chatMessage);
        });
      }

      broadcastGameUpdate(io, gameId, game);
    } catch (error) {
      logger.error("Error processing chat message", {
        error: error.message,
        socketId: socket.id,
      });
      // Don't emit error to prevent chat from breaking
    }
  });

  socket.on("disconnect", () => {
    logger.info("User disconnected", { socketId: socket.id });
    rateLimiter.reset(socket.id);

    // Remove player from all games
    const disconnectResult = gameService.handlePlayerDisconnect(socket.id);

    if (disconnectResult) {
      const { gameId, playerName, updatedGame } = disconnectResult;

      io.to(gameId).emit("player-left", {
        userId: socket.id,
        playerName,
        newOwnerId: updatedGame?.ownerId,
      });

      if (updatedGame) {
        broadcastGameUpdate(io, gameId, updatedGame);
      }
    }
  });

  socket.on("restart-game", async (data) => {
    const { gameId, settings } = data;

    try {
      const restartedGame = await gameService.restartGame(
        gameId,
        socket.id,
        settings
      );
      if (restartedGame) {
        io.to(gameId).emit("game-restarted", restartedGame);
        broadcastGameUpdate(io, gameId, restartedGame);
      }
    } catch (error) {
      logger.error("Error restarting game", { error: error.message });
      socket.emit("error", {
        message: error.message || "Failed to restart game. Please try again.",
      });
    }
  });

  socket.on("toggle-ready", (data) => {
    const { gameId } = data;

    try {
      const game = gameService.togglePlayerReady(gameId, socket.id);
      if (game) {
        broadcastGameUpdate(io, gameId, game);
      }
    } catch (error) {
      logger.error("Error toggling ready status", { error: error.message });
    }
  });

  socket.on("kick-player", (data) => {
    const { gameId, targetPlayerId } = data;

    try {
      const updatedGame = gameService.kickPlayer(
        gameId,
        socket.id,
        targetPlayerId
      );

      if (updatedGame) {
        // Notify the kicked player
        io.to(targetPlayerId).emit("kicked", {
          message: "You have been removed from the game by the room owner",
        });

        // Notify all players
        io.to(gameId).emit("player-kicked", {
          playerId: targetPlayerId,
        });

        broadcastGameUpdate(io, gameId, updatedGame);

        logger.info("Player kicked", {
          gameId,
          targetPlayerId,
          kickedBy: socket.id,
        });
      }
    } catch (error) {
      logger.error("Error kicking player", { error: error.message });
      socket.emit("error", { message: error.message });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
