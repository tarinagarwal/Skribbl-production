import { v4 as uuidv4 } from "uuid";
import { getDatabase, checkDatabaseHealth } from "./database.js";

class GameManager {
  constructor() {
    this.games = new Map();
    this.timers = new Map();
    this.hintTimers = new Map();
  }

  async createGame(roomCode, settings = {}) {
    try {
      const db = getDatabase();
      const gameId = uuidv4();
      const { drawTime = 80, maxRounds = 3 } = settings;
      let ownerId = null;

      await db.sql`INSERT INTO games (id, room_code, max_rounds, owner_id) VALUES (${gameId}, ${roomCode}, ${maxRounds}, ${ownerId})`;

      this.games.set(gameId, {
        id: gameId,
        roomCode,
        ownerId: null, // Will be set when first player joins
        players: [],
        playersReady: [],
        currentWord: null,
        wordChoices: null,
        currentDrawer: null,
        round: 1,
        maxRounds,
        drawTime,
        status: "waiting",
        gamePhase: "drawing",
        timeLeft: 0,
        drawingData: [],
        hints: "",
      });

      return gameId;
    } catch (error) {
      console.error("Error creating game:", error);
      throw new Error("Failed to create game. Database connection issue.");
    }
  }

  async joinGame(gameId, user) {
    try {
      const db = getDatabase();
      const game = this.games.get(gameId);
      if (!game) return null;

      // Set first player as owner
      if (!game.ownerId && game.players.length === 0) {
        game.ownerId = user.id;
        await db.sql`UPDATE games SET owner_id = ${user.id} WHERE id = ${gameId}`;
      }

      // Add user to database
      await db.sql`INSERT OR REPLACE INTO users (id, name, avatar) VALUES (${
        user.id
      }, ${user.name}, ${user.avatar || ""})`;

      // Add player to game
      await db.sql`INSERT OR REPLACE INTO game_players (game_id, user_id, score) VALUES (${gameId}, ${
        user.id
      }, ${0})`;

      const existingPlayer = game.players.find((p) => p.id === user.id);
      if (!existingPlayer) {
        game.players.push({
          ...user,
          score: 0,
          isDrawer: false,
          hasGuessed: false,
        });
      }

      return game;
    } catch (error) {
      console.error("Error joining game:", error);
      throw new Error("Failed to join game. Database connection issue.");
    }
  }

  async startGame(gameId, io) {
    try {
      const db = getDatabase();
      const game = this.games.get(gameId);
      if (!game || game.players.length < 2) return null;

      // Reset all players' guess status
      game.players.forEach((player) => {
        player.hasGuessed = false;
      });

      game.status = "playing";
      game.currentDrawer = game.players[0];

      // Get 3 random words for choice
      const randomWords =
        await db.sql`SELECT word FROM words ORDER BY RANDOM() LIMIT 3`;
      game.wordChoices = randomWords.map((row) => row.word);
      game.gamePhase = "choosing";
      game.timeLeft = 10; // 10 seconds to choose
      game.hints = "";

      await db.sql`UPDATE games SET status = ${game.status}, current_drawer = ${game.currentDrawer.id} WHERE id = ${gameId}`;

      // Send word choices to drawer (only if io is provided)
      if (io) {
        io.to(gameId).emit("word-choices", { words: game.wordChoices });
        this.startChoiceTimer(gameId, io);
      }

      return game;
    } catch (error) {
      console.error("Error starting game:", error);
      throw new Error("Failed to start game. Database connection issue.");
    }
  }

  async selectWord(gameId, word, io) {
    try {
      const db = getDatabase();
      const game = this.games.get(gameId);
      if (!game) return null;

      game.currentWord = word;
      game.wordChoices = null;
      game.gamePhase = "drawing";
      game.timeLeft = game.drawTime;
      // Create proper spacing for words with spaces
      game.hints = word
        .split("")
        .map((char) => {
          if (char === " ") {
            return "     "; // 5 spaces to create visible gap
          }
          return "_";
        })
        .join(" ");

      await db.sql`UPDATE games SET current_word = ${word} WHERE id = ${gameId}`;

      // Clear choice timer
      this.clearChoiceTimer(gameId);

      if (io) {
        io.to(gameId).emit("word-selected", { word });
        this.startDrawTimer(gameId, io);
        this.startHintTimer(gameId, io);
      }

      return game;
    } catch (error) {
      console.error("Error selecting word:", error);
      throw new Error("Failed to select word. Database connection issue.");
    }
  }

  async nextTurn(gameId, io) {
    try {
      const db = getDatabase();
      const game = this.games.get(gameId);
      if (!game) return null;

      // Clear existing timers
      this.clearGameTimers(gameId);

      // Show round end screen before proceeding
      if (io) {
        io.to(gameId).emit("round-end", {
          word: game.currentWord,
          drawer: game.currentDrawer?.name,
          round: game.round,
          maxRounds: game.maxRounds,
        });
      }

      // Wait 3 seconds before proceeding to next turn
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Handle case where currentDrawer might be null (e.g., after restart)
      let currentDrawerIndex = -1;
      if (game.currentDrawer && game.currentDrawer.id) {
        currentDrawerIndex = game.players.findIndex(
          (p) => p.id === game.currentDrawer.id
        );
      }

      // If currentDrawer not found or null, start from beginning
      if (currentDrawerIndex === -1) {
        currentDrawerIndex = -1; // Will become 0 after increment
      }

      const nextDrawerIndex = (currentDrawerIndex + 1) % game.players.length;

      if (nextDrawerIndex === 0) {
        game.round++;
        if (game.round > game.maxRounds) {
          game.status = "finished";
          // Owner is automatically ready when game finishes
          game.playersReady = [game.ownerId];
          await db.sql`UPDATE games SET status = ${"finished"} WHERE id = ${gameId}`;
          return game;
        }
      }

      this.resetGuessStatus(game);

      game.currentDrawer = game.players[nextDrawerIndex];
      const randomWords =
        await db.sql`SELECT word FROM words ORDER BY RANDOM() LIMIT 3`;
      game.wordChoices = randomWords.map((row) => row.word);
      game.currentWord = null;
      game.gamePhase = "choosing";
      game.timeLeft = 10;
      game.drawingData = [];
      game.hints = "";

      await db.sql`UPDATE games SET current_drawer = ${game.currentDrawer.id}, round = ${game.round} WHERE id = ${gameId}`;

      io.to(gameId).emit("word-choices", { words: game.wordChoices });
      this.startChoiceTimer(gameId, io);

      return game;
    } catch (error) {
      console.error("Error in next turn:", error);
      throw new Error(
        "Failed to proceed to next turn. Database connection issue."
      );
    }
  }

  startChoiceTimer(gameId, io) {
    this.clearChoiceTimer(gameId);

    const game = this.games.get(gameId);
    if (!game) return;

    // Use server-side countdown for accurate timing
    let timeLeft = game.timeLeft;

    const timer = setInterval(async () => {
      const game = this.games.get(gameId);
      if (!game) {
        clearInterval(timer);
        this.timers.delete(gameId + "_choice");
        return;
      }

      // Decrement server-side timer
      timeLeft = Math.max(0, timeLeft - 1);
      game.timeLeft = timeLeft;

      // Emit time update
      if (io) {
        io.to(gameId).emit("game-update", game);
        io.to(gameId).emit("timer-update", { timeLeft });
      }

      if (timeLeft <= 0) {
        clearInterval(timer);
        this.timers.delete(gameId + "_choice");
        // Auto-select first word if time runs out
        if (game.wordChoices && game.wordChoices.length > 0) {
          try {
            await this.selectWord(gameId, game.wordChoices[0], io);
          } catch (error) {
            console.error("Error auto-selecting word:", error);
          }
        }
      }
    }, 1000);

    this.timers.set(gameId + "_choice", timer);
  }

  clearChoiceTimer(gameId) {
    if (this.timers.has(gameId + "_choice")) {
      clearInterval(this.timers.get(gameId + "_choice"));
      this.timers.delete(gameId + "_choice");
    }
  }

  startDrawTimer(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) return;

    // Use server-side countdown for accurate timing
    let timeLeft = game.timeLeft;

    const timer = setInterval(async () => {
      const game = this.games.get(gameId);
      if (!game) {
        clearInterval(timer);
        this.timers.delete(gameId + "_draw");
        return;
      }

      // Decrement server-side timer
      timeLeft = Math.max(0, timeLeft - 1);
      game.timeLeft = timeLeft;

      // Emit time update
      if (io) {
        io.to(gameId).emit("game-update", game);
        io.to(gameId).emit("timer-update", { timeLeft });
      }

      if (timeLeft <= 0) {
        clearInterval(timer);
        this.timers.delete(gameId + "_draw");
        this.resetGuessStatus(game);
        try {
          await this.nextTurn(gameId, io);
          const updatedGame = this.games.get(gameId);
          if (io) {
            io.to(gameId).emit("next-turn", updatedGame);
            io.to(gameId).emit("game-update", updatedGame);
          }
        } catch (error) {
          console.error("Error in draw timer next turn:", error);
        }
      }
    }, 1000);

    this.timers.set(gameId + "_draw", timer);
  }

  startHintTimer(gameId, io) {
    const game = this.games.get(gameId);
    if (!game || !game.currentWord) return;

    const word = game.currentWord;
    const totalTime = game.drawTime;
    const startTime = Date.now();

    // Only reveal hints for words longer than 3 characters
    if (word.length <= 3) return;

    // Calculate how many characters to reveal (max 50% of word length)
    const maxHints = Math.floor(word.length * 0.5);
    const hintInterval = Math.floor(totalTime / (maxHints + 1));

    // Create array of character positions (excluding spaces)
    const charPositions = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== " ") {
        charPositions.push(i);
      }
    }

    // Shuffle positions for random revelation
    const shuffledPositions = [...charPositions].sort(
      () => Math.random() - 0.5
    );
    let hintsRevealed = 0;

    const timer = setInterval(() => {
      const currentGame = this.games.get(gameId);
      if (!currentGame || currentGame.gamePhase !== "drawing") {
        clearInterval(timer);
        this.hintTimers.delete(gameId);
        return;
      }

      // Calculate actual elapsed time
      const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
      const shouldRevealHints = Math.floor(timeElapsed / hintInterval);

      if (shouldRevealHints > hintsRevealed && hintsRevealed < maxHints) {
        hintsRevealed = shouldRevealHints;

        // Create hints with randomly revealed characters
        const hints = word
          .split("")
          .map((char, index) => {
            if (char === " ") {
              return "     "; // 5 spaces to create visible gap
            }
            return shuffledPositions.slice(0, hintsRevealed).includes(index)
              ? char
              : "_";
          })
          .join(" ");

        currentGame.hints = hints;
        if (io) {
          io.to(gameId).emit("hint-update", { hints });
        }
      }
    }, 1000);

    this.hintTimers.set(gameId, timer);
  }

  clearGameTimers(gameId) {
    // Clear all timers for this game
    const timerKeys = [gameId, gameId + "_choice", gameId + "_draw"];
    timerKeys.forEach((key) => {
      if (this.timers.has(key)) {
        clearInterval(this.timers.get(key));
        this.timers.delete(key);
      }
    });

    if (this.hintTimers.has(gameId)) {
      clearInterval(this.hintTimers.get(gameId));
      this.hintTimers.delete(gameId);
    }
  }

  // Filter chat messages to hide the current word
  filterChatMessage(message, currentWord) {
    if (!currentWord) return message;

    // Create a regex that matches the word (case insensitive, whole word)
    const wordRegex = new RegExp(
      `\\b${currentWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi"
    );

    // Replace the word with asterisks
    return message.replace(wordRegex, (match) => "*".repeat(match.length));
  }

  async checkGuess(gameId, userId, guess) {
    try {
      const db = getDatabase();
      const game = this.games.get(gameId);
      if (!game || !game.currentWord || game.gamePhase !== "drawing")
        return false;

      // Don't allow drawer to guess
      if (game.currentDrawer && game.currentDrawer.id === userId) return false;

      const isCorrect =
        guess.toLowerCase().trim() === game.currentWord.toLowerCase();

      if (isCorrect) {
        const player = game.players.find((p) => p.id === userId);
        if (player) {
          // Calculate points based on time left (more time = more points)
          const basePoints = 100;
          const timeBonus = Math.floor((game.timeLeft / game.drawTime) * 50);
          const points = Math.max(10, basePoints + timeBonus);
          player.score += points;

          // Update score in database
          await db.sql`UPDATE game_players SET score = ${player.score} WHERE game_id = ${gameId} AND user_id = ${userId}`;

          // Give points to drawer for each correct guess
          const drawer = game.players.find(
            (p) => p.id === game.currentDrawer.id
          );
          if (drawer) {
            drawer.score += 25; // Drawer gets points for each correct guess
            await db.sql`UPDATE game_players SET score = ${drawer.score} WHERE game_id = ${gameId} AND user_id = ${game.currentDrawer.id}`;
          }

          // Mark player as having guessed correctly
          player.hasGuessed = true;
        }
      }

      // Save message to database
      await db.sql`INSERT INTO chat_messages (game_id, user_id, message, is_guess) VALUES (${gameId}, ${userId}, ${guess}, ${1})`;

      return isCorrect;
    } catch (error) {
      console.error("Error checking guess:", error);
      return false; // Return false on error to prevent game breaking
    }
  }

  // Check if all non-drawer players have guessed correctly
  allPlayersGuessed(game) {
    const nonDrawers = game.players.filter(
      (p) => p.id !== game.currentDrawer?.id
    );
    const correctGuessers = nonDrawers.filter((p) => p.hasGuessed);
    return (
      nonDrawers.length > 0 && correctGuessers.length === nonDrawers.length
    );
  }

  // Reset guess status for all players
  resetGuessStatus(game) {
    game.players.forEach((player) => {
      player.hasGuessed = false;
    });
  }

  async saveMessage(gameId, userId, message) {
    try {
      const db = getDatabase();
      await db.sql`INSERT INTO chat_messages (game_id, user_id, message) VALUES (${gameId}, ${userId}, ${message})`;
    } catch (error) {
      console.error("Error saving message:", error);
      // Don't throw error to prevent chat from breaking
    }
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  async getGameByRoomCode(roomCode) {
    try {
      const db = getDatabase();
      const gameDataResult =
        await db.sql`SELECT * FROM games WHERE room_code = ${roomCode} ORDER BY created_at DESC LIMIT 1`;
      const gameData = gameDataResult[0] || null;

      if (!gameData) return null;

      if (!this.games.has(gameData.id)) {
        // Restore game from database
        const players = await db.sql`
          SELECT u.id, u.name, u.avatar, gp.score 
          FROM users u 
          JOIN game_players gp ON u.id = gp.user_id 
          WHERE gp.game_id = ${gameData.id}
        `;

        this.games.set(gameData.id, {
          id: gameData.id,
          roomCode: gameData.room_code,
          ownerId: gameData.owner_id,
          players: players.map((p) => ({
            ...p,
            isDrawer: p.id === gameData.current_drawer,
            hasGuessed: false,
          })),
          playersReady: [],
          currentWord: gameData.current_word,
          wordChoices: null,
          currentDrawer: players.find((p) => p.id === gameData.current_drawer),
          round: gameData.round,
          maxRounds: gameData.max_rounds,
          drawTime: 80, // Default draw time for restored games
          status: gameData.status,
          gamePhase: "drawing",
          timeLeft: gameData.status === "playing" ? 80 : 0,
          drawingData: [],
          hints: gameData.current_word
            ? gameData.current_word
                .split("")
                .map(() => "_")
                .join(" ")
            : "",
        });
      }

      return this.games.get(gameData.id);
    } catch (error) {
      console.error("Error getting game by room code:", error);
      return null; // Return null instead of throwing to prevent server crash
    }
  }

  removePlayer(gameId, userId) {
    const game = this.games.get(gameId);
    if (!game) return;

    const wasOwner = game.ownerId === userId;
    const wasDrawer = game.currentDrawer?.id === userId;
    game.players = game.players.filter((p) => p.id !== userId);
    game.playersReady = game.playersReady.filter((id) => id !== userId);

    if (game.players.length === 0) {
      this.games.delete(gameId);
      this.clearGameTimers(gameId);
    } else {
      // If drawer left during active game, clear timers and handle turn
      if (wasDrawer && game.status === "playing") {
        this.clearGameTimers(gameId);
        console.log(`Drawer left game ${gameId}, clearing timers`);
      }

      if (wasOwner && game.players.length > 0) {
        // Transfer ownership to a random remaining player
        const randomIndex = Math.floor(Math.random() * game.players.length);
        const newOwnerId = game.players[randomIndex].id;
        game.ownerId = newOwnerId;

        // New owner is automatically ready if game is finished
        if (
          game.status === "finished" &&
          !game.playersReady.includes(newOwnerId)
        ) {
          game.playersReady.push(newOwnerId);
        }

        console.log(
          `Ownership transferred to player: ${game.players[randomIndex].name}`
        );
      }
    }

    return game;
  }

  async restartGame(gameId, settings = {}) {
    try {
      const db = getDatabase();
      const game = this.games.get(gameId);
      if (!game) return null;

      const { drawTime = 80, maxRounds = 3 } = settings;

      // Clear any existing timers first
      this.clearGameTimers(gameId);

      // Reset game state but keep players and room
      game.currentWord = null;
      game.wordChoices = null;
      game.currentDrawer = null;
      game.round = 1;
      game.maxRounds = maxRounds;
      game.drawTime = drawTime;
      game.status = "waiting";
      game.gamePhase = "drawing";
      game.timeLeft = 0;
      game.drawingData = [];
      game.hints = "";
      game.playersReady = [game.ownerId]; // Owner is automatically ready

      // Reset all player scores and guess status
      game.players.forEach((player) => {
        player.score = 0;
        player.hasGuessed = false;
        player.isDrawer = false;
      });

      // Update database
      await db.sql`UPDATE games SET status = ${game.status}, current_word = NULL, current_drawer = NULL, round = ${game.round}, max_rounds = ${game.maxRounds} WHERE id = ${gameId}`;

      // Reset player scores in database
      await db.sql`UPDATE game_players SET score = 0 WHERE game_id = ${gameId}`;

      return game;
    } catch (error) {
      console.error("Error restarting game:", error);
      throw new Error("Failed to restart game. Database connection issue.");
    }
  }

  togglePlayerReady(gameId, userId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const readyIndex = game.playersReady.indexOf(userId);
    if (readyIndex === -1) {
      game.playersReady.push(userId);
    } else {
      game.playersReady.splice(readyIndex, 1);
    }

    return game;
  }
}

export default GameManager;
