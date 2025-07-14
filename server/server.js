import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { initDatabase, checkDatabaseHealth } from "./database.js";
import GameManager from "./gameManager.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // For local development
      "https://localhost:5173", // For local HTTPS
      "https://skribbl-production.onrender.com", // Your deployed backend
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
app.get("/health", async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? "OK" : "UNHEALTHY",
    message: "Skribbl server is running",
    database: dbHealthy ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Basic route for testing
app.get("/", (req, res) => {
  res.json({
    message: "Skribbl.io Server",
    status: "Running",
    endpoints: {
      health: "/health",
      socket: "Socket.IO connection available",
    },
  });
});

const gameManager = new GameManager();

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
  console.log("User connected:", socket.id);

  socket.on("join-game", async (data) => {
    const { roomCode, playerName, settings } = data;

    console.log(
      `Player ${playerName} attempting to join/create room ${roomCode}`
    );

    try {
      let game = await gameManager.getGameByRoomCode(roomCode);

      if (!game) {
        console.log(`Creating new game with room code: ${roomCode}`);
        const gameId = await gameManager.createGame(roomCode, settings);
        game = gameManager.getGame(gameId);
        console.log("New game created:", game);
      }

      const user = {
        id: socket.id,
        name: playerName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerName}`,
      };

      await gameManager.joinGame(game.id, user);
      socket.join(game.id);

      console.log(`Player ${playerName} joined game ${game.id}`);

      socket.emit("game-joined", {
        gameId: game.id,
        roomCode: game.roomCode,
        user,
      });

      io.to(game.id).emit("game-update", game);
    } catch (error) {
      console.error("Error joining game:", error);
      socket.emit("error", {
        message: "Failed to join game. Please try again in a moment.",
      });
    }
  });

  socket.on("start-game", async (data) => {
    const { gameId } = data;

    try {
      const game = gameManager.getGame(gameId);

      // Check if the player is the room owner
      if (!game || game.ownerId !== socket.id) {
        socket.emit("error", {
          message: "Only the room owner can start the game",
        });
        return;
      }

      const startedGame = await gameManager.startGame(gameId, io);
      if (startedGame) {
        io.to(gameId).emit("game-started", startedGame);
        io.to(gameId).emit("game-update", startedGame);
      }
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error", {
        message: "Failed to start game. Please try again.",
      });
    }
  });

  socket.on("word-select", async (data) => {
    const { gameId, word } = data;

    try {
      const game = await gameManager.selectWord(gameId, word, io);
      if (game) {
        io.to(gameId).emit("game-update", game);
      }
    } catch (error) {
      console.error("Error selecting word:", error);
      socket.emit("error", {
        message: "Failed to select word. Please try again.",
      });
    }
  });

  socket.on("drawing", (data) => {
    const { gameId, drawingData } = data;
    const game = gameManager.getGame(gameId);

    if (
      game &&
      game.currentDrawer &&
      game.currentDrawer.id === socket.id &&
      game.status === "playing"
    ) {
      game.drawingData.push(drawingData);
      // Broadcast to all other players in the room
      socket.to(gameId).emit("drawing", drawingData);
      console.log(`Drawing data broadcasted to room ${gameId}:`, drawingData);
    }
  });

  socket.on("clear-canvas", (data) => {
    const { gameId } = data;
    const game = gameManager.getGame(gameId);

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
    const { gameId, message } = data;
    const game = gameManager.getGame(gameId);

    if (game) {
      const user = game.players.find((p) => p.id === socket.id);
      if (user) {
        try {
          const isCorrect = await gameManager.checkGuess(
            gameId,
            socket.id,
            message
          );

          if (isCorrect && user.id !== game.currentDrawer.id) {
            // Send correct guess notification only to drawer and players who have guessed correctly
            const correctGuessMessage = {
              userId: socket.id,
              userName: user.name,
              word: game.currentWord,
            };

            // Send to drawer and players who have guessed correctly
            game.players.forEach((player) => {
              if (player.hasGuessed || player.id === game.currentDrawer?.id) {
                io.to(player.id).emit("correct-guess", correctGuessMessage);
              }
            });

            // Check if all non-drawer players have guessed correctly
            if (gameManager.allPlayersGuessed(game)) {
              // All players guessed correctly, move to next turn after delay
              setTimeout(async () => {
                try {
                  gameManager.resetGuessStatus(game);
                  await gameManager.nextTurn(gameId, io);
                  const updatedGame = gameManager.getGame(gameId);
                  if (updatedGame) {
                    io.to(gameId).emit("next-turn", updatedGame);
                    io.to(gameId).emit("game-update", updatedGame);
                  }
                } catch (error) {
                  console.error("Error in next turn after all guessed:", error);
                }
              }, 3000);
            }
          } else if (!isCorrect && user.id !== game.currentDrawer?.id) {
            // Send chat message to players who haven't guessed correctly
            await gameManager.saveMessage(gameId, socket.id, message);

            const chatMessage = {
              userId: socket.id,
              userName: user.name,
              message,
              timestamp: new Date().toISOString(),
            };

            // Send to players who haven't guessed correctly
            game.players.forEach((player) => {
              if (!player.hasGuessed && player.id !== game.currentDrawer?.id) {
                io.to(player.id).emit("chat-message", chatMessage);
              }
            });
          } else if (user.id === game.currentDrawer?.id) {
            // Drawer's message - only visible to players who have guessed correctly
            await gameManager.saveMessage(gameId, socket.id, message);

            const chatMessage = {
              userId: socket.id,
              userName: user.name,
              message,
              timestamp: new Date().toISOString(),
            };

            // Send to players who have guessed correctly
            game.players.forEach((player) => {
              if (player.hasGuessed || player.id === game.currentDrawer?.id) {
                io.to(player.id).emit("chat-message", chatMessage);
              }
            });
          } else if (user.hasGuessed) {
            // Player who has guessed correctly - visible to drawer and other correct guessers
            await gameManager.saveMessage(gameId, socket.id, message);

            const chatMessage = {
              userId: socket.id,
              userName: user.name,
              message,
              timestamp: new Date().toISOString(),
            };

            // Send to drawer and players who have guessed correctly
            game.players.forEach((player) => {
              if (player.hasGuessed || player.id === game.currentDrawer?.id) {
                io.to(player.id).emit("chat-message", chatMessage);
              }
            });
          }

          io.to(gameId).emit("game-update", game);
        } catch (error) {
          console.error("Error processing chat message:", error);
          // Don't emit error to prevent chat from breaking
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove player from all games
    for (const [gameId, game] of gameManager.games) {
      if (game.players.find((p) => p.id === socket.id)) {
        const updatedGame = gameManager.removePlayer(gameId, socket.id);

        // Get player name before removal for the message
        const leavingPlayer = game.players.find((p) => p.id === socket.id);
        const playerName = leavingPlayer ? leavingPlayer.name : "A player";

        io.to(gameId).emit("player-left", {
          userId: socket.id,
          playerName,
          newOwnerId: updatedGame?.ownerId,
        });

        if (updatedGame) {
          io.to(gameId).emit("game-update", updatedGame);
        }

        // Clear any running timers for disconnected players
        if (updatedGame && updatedGame.players.length === 0) {
          gameManager.clearGameTimers(gameId);
        }

        break;
      }
    }
  });

  socket.on("restart-game", async (data) => {
    const { gameId, settings } = data;

    try {
      const game = gameManager.getGame(gameId);

      // Check if the player is the room owner
      if (!game || game.ownerId !== socket.id) {
        socket.emit("error", {
          message: "Only the room owner can restart the game",
        });
        return;
      }

      const restartedGame = await gameManager.restartGame(gameId, settings);
      if (restartedGame) {
        io.to(gameId).emit("game-restarted", restartedGame);
        io.to(gameId).emit("game-update", restartedGame);
      }
    } catch (error) {
      console.error("Error restarting game:", error);
      socket.emit("error", {
        message: "Failed to restart game. Please try again.",
      });
    }
  });

  socket.on("toggle-ready", (data) => {
    const { gameId } = data;

    try {
      const game = gameManager.togglePlayerReady(gameId, socket.id);
      if (game) {
        io.to(gameId).emit("game-update", game);
      }
    } catch (error) {
      console.error("Error toggling ready status:", error);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
