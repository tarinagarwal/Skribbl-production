// Replay Service - Save and retrieve game replays
import { getDatabase } from "../database.js";
import logger from "../utils/logger.js";

class ReplayService {
  async initializeReplayTable() {
    try {
      const db = getDatabase();

      await db.sql`
        CREATE TABLE IF NOT EXISTS game_replays (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          room_code TEXT NOT NULL,
          players TEXT NOT NULL,
          winner_id TEXT,
          winner_name TEXT,
          total_rounds INTEGER,
          drawing_data TEXT,
          chat_history TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES games(id)
        )
      `;

      logger.info("Replay table initialized");
    } catch (error) {
      logger.error("Error initializing replay table", { error: error.message });
    }
  }

  async saveGameReplay(game, chatHistory) {
    try {
      const db = getDatabase();

      // Find winner
      const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];

      // Prepare data for storage
      const playersData = JSON.stringify(
        game.players.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
        }))
      );

      const drawingData = JSON.stringify(game.drawingData);
      const chatData = JSON.stringify(chatHistory);

      await db.sql`
        INSERT INTO game_replays (
          game_id,
          room_code,
          players,
          winner_id,
          winner_name,
          total_rounds,
          drawing_data,
          chat_history
        ) VALUES (
          ${game.id},
          ${game.roomCode},
          ${playersData},
          ${winner.id},
          ${winner.name},
          ${game.maxRounds},
          ${drawingData},
          ${chatData}
        )
      `;

      logger.info("Game replay saved", { gameId: game.id });
      return true;
    } catch (error) {
      logger.error("Error saving game replay", { error: error.message });
      return false;
    }
  }

  async getReplay(replayId) {
    try {
      const db = getDatabase();

      const replays = await db.sql`
        SELECT * FROM game_replays WHERE id = ${replayId}
      `;

      if (replays.length === 0) {
        return null;
      }

      const replay = replays[0];

      // Parse JSON data
      return {
        ...replay,
        players: JSON.parse(replay.players),
        drawing_data: JSON.parse(replay.drawing_data),
        chat_history: JSON.parse(replay.chat_history),
      };
    } catch (error) {
      logger.error("Error getting replay", { error: error.message, replayId });
      return null;
    }
  }

  async getRecentReplays(limit = 10) {
    try {
      const db = getDatabase();

      const replays = await db.sql`
        SELECT 
          id,
          game_id,
          room_code,
          players,
          winner_name,
          total_rounds,
          created_at
        FROM game_replays
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return replays.map((replay) => ({
        ...replay,
        players: JSON.parse(replay.players),
      }));
    } catch (error) {
      logger.error("Error getting recent replays", { error: error.message });
      return [];
    }
  }

  async getUserReplays(userId, limit = 10) {
    try {
      const db = getDatabase();

      const replays = await db.sql`
        SELECT 
          id,
          game_id,
          room_code,
          players,
          winner_name,
          total_rounds,
          created_at
        FROM game_replays
        WHERE players LIKE '%' || ${userId} || '%'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return replays.map((replay) => ({
        ...replay,
        players: JSON.parse(replay.players),
      }));
    } catch (error) {
      logger.error("Error getting user replays", {
        error: error.message,
        userId,
      });
      return [];
    }
  }
}

export default ReplayService;
