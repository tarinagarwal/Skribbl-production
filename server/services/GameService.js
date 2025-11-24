// Game Service - Business logic layer
import GameManager from "../gameManager.js";
import logger from "../utils/logger.js";

class GameService {
  constructor() {
    this.gameManager = new GameManager();
  }

  async createOrJoinGame(roomCode, playerName, settings, socketId) {
    try {
      let game = await this.gameManager.getGameByRoomCode(roomCode);

      if (!game) {
        logger.info("Creating new game", { roomCode });
        const gameId = await this.gameManager.createGame(roomCode, settings);
        game = this.gameManager.getGame(gameId);
      }

      const user = {
        id: socketId,
        name: playerName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerName}`,
      };

      await this.gameManager.joinGame(game.id, user);

      logger.info("Player joined game", {
        playerName,
        gameId: game.id,
      });

      return { game, user };
    } catch (error) {
      logger.error("Error in createOrJoinGame", { error: error.message });
      throw error;
    }
  }

  async startGame(gameId, ownerId, io) {
    const game = this.gameManager.getGame(gameId);

    if (!game || game.ownerId !== ownerId) {
      throw new Error("Only the room owner can start the game");
    }

    return await this.gameManager.startGame(gameId, io);
  }

  async selectWord(gameId, word, io) {
    return await this.gameManager.selectWord(gameId, word, io);
  }

  handleDrawing(gameId, drawingData, socketId) {
    const game = this.gameManager.getGame(gameId);

    if (
      !game ||
      !game.currentDrawer ||
      game.currentDrawer.id !== socketId ||
      game.status !== "playing"
    ) {
      return null;
    }

    // Limit drawing data to prevent memory issues
    if (game.drawingData.length > 5000) {
      game.drawingData = game.drawingData.slice(-4000);
    }

    game.drawingData.push(drawingData);
    return game;
  }

  clearCanvas(gameId, socketId) {
    const game = this.gameManager.getGame(gameId);

    if (
      !game ||
      !game.currentDrawer ||
      game.currentDrawer.id !== socketId ||
      game.status !== "playing"
    ) {
      return null;
    }

    game.drawingData = [];
    return game;
  }

  async processChatMessage(gameId, message, socketId) {
    const game = this.gameManager.getGame(gameId);

    if (!game) {
      return null;
    }

    const user = game.players.find((p) => p.id === socketId);
    if (!user) {
      return null;
    }

    const isCorrect = await this.gameManager.checkGuess(
      gameId,
      socketId,
      message
    );

    return { game, user, isCorrect };
  }

  handlePlayerDisconnect(socketId) {
    for (const [gameId, game] of this.gameManager.games) {
      const player = game.players.find((p) => p.id === socketId);
      if (player) {
        const updatedGame = this.gameManager.removePlayer(gameId, socketId);
        return { gameId, playerName: player.name, updatedGame };
      }
    }
    return null;
  }

  async restartGame(gameId, ownerId, settings) {
    const game = this.gameManager.getGame(gameId);

    if (!game || game.ownerId !== ownerId) {
      throw new Error("Only the room owner can restart the game");
    }

    return await this.gameManager.restartGame(gameId, settings);
  }

  togglePlayerReady(gameId, socketId) {
    return this.gameManager.togglePlayerReady(gameId, socketId);
  }

  kickPlayer(gameId, ownerId, targetPlayerId) {
    const game = this.gameManager.getGame(gameId);

    if (!game || game.ownerId !== ownerId) {
      throw new Error("Only the room owner can kick players");
    }

    if (targetPlayerId === ownerId) {
      throw new Error("Cannot kick yourself");
    }

    // Add to banned list
    if (!game.bannedPlayers) {
      game.bannedPlayers = [];
    }
    game.bannedPlayers.push(targetPlayerId);

    // Remove player
    const updatedGame = this.gameManager.removePlayer(gameId, targetPlayerId);
    return updatedGame;
  }

  isPlayerBanned(gameId, playerId) {
    const game = this.gameManager.getGame(gameId);
    if (!game) return false;
    return game.bannedPlayers?.includes(playerId) || false;
  }

  getGame(gameId) {
    return this.gameManager.getGame(gameId);
  }
}

export default GameService;
