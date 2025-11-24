// Statistics Service
import { getDatabase } from "../database.js";
import logger from "../utils/logger.js";

class StatsService {
  async initializeStatsTable() {
    try {
      const db = getDatabase();

      await db.sql`
        CREATE TABLE IF NOT EXISTS player_stats (
          user_id TEXT PRIMARY KEY,
          games_played INTEGER DEFAULT 0,
          games_won INTEGER DEFAULT 0,
          total_score INTEGER DEFAULT 0,
          correct_guesses INTEGER DEFAULT 0,
          words_drawn INTEGER DEFAULT 0,
          last_played DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      logger.info("Stats table initialized");
    } catch (error) {
      logger.error("Error initializing stats table", { error: error.message });
    }
  }

  async updatePlayerStats(userId, updates) {
    try {
      const db = getDatabase();

      // Get current stats
      const currentStats = await db.sql`
        SELECT * FROM player_stats WHERE user_id = ${userId}
      `;

      if (currentStats.length === 0) {
        // Create new stats entry
        await db.sql`
          INSERT INTO player_stats (
            user_id, 
            games_played, 
            games_won, 
            total_score, 
            correct_guesses, 
            words_drawn
          ) VALUES (
            ${userId}, 
            ${updates.gamesPlayed || 0}, 
            ${updates.gamesWon || 0}, 
            ${updates.totalScore || 0}, 
            ${updates.correctGuesses || 0}, 
            ${updates.wordsDrawn || 0}
          )
        `;
      } else {
        // Update existing stats
        const stats = currentStats[0];
        await db.sql`
          UPDATE player_stats SET
            games_played = ${stats.games_played + (updates.gamesPlayed || 0)},
            games_won = ${stats.games_won + (updates.gamesWon || 0)},
            total_score = ${stats.total_score + (updates.totalScore || 0)},
            correct_guesses = ${
              stats.correct_guesses + (updates.correctGuesses || 0)
            },
            words_drawn = ${stats.words_drawn + (updates.wordsDrawn || 0)},
            last_played = CURRENT_TIMESTAMP
          WHERE user_id = ${userId}
        `;
      }

      logger.debug("Player stats updated", { userId, updates });
    } catch (error) {
      logger.error("Error updating player stats", {
        error: error.message,
        userId,
      });
    }
  }

  async getPlayerStats(userId) {
    try {
      const db = getDatabase();

      const stats = await db.sql`
        SELECT * FROM player_stats WHERE user_id = ${userId}
      `;

      return stats[0] || null;
    } catch (error) {
      logger.error("Error getting player stats", {
        error: error.message,
        userId,
      });
      return null;
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const db = getDatabase();

      const leaderboard = await db.sql`
        SELECT 
          ps.*,
          u.name,
          u.avatar
        FROM player_stats ps
        JOIN users u ON ps.user_id = u.id
        ORDER BY ps.total_score DESC
        LIMIT ${limit}
      `;

      return leaderboard;
    } catch (error) {
      logger.error("Error getting leaderboard", { error: error.message });
      return [];
    }
  }

  async recordGameFinish(game) {
    try {
      // Find winner (player with highest score)
      const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];

      // Update stats for all players
      for (const player of game.players) {
        const updates = {
          gamesPlayed: 1,
          gamesWon: player.id === winner.id ? 1 : 0,
          totalScore: player.score,
        };

        await this.updatePlayerStats(player.id, updates);
      }

      logger.info("Game finish recorded", {
        gameId: game.id,
        winner: winner.name,
      });
    } catch (error) {
      logger.error("Error recording game finish", { error: error.message });
    }
  }

  async recordCorrectGuess(userId) {
    try {
      await this.updatePlayerStats(userId, { correctGuesses: 1 });
    } catch (error) {
      logger.error("Error recording correct guess", {
        error: error.message,
        userId,
      });
    }
  }

  async recordWordDrawn(userId) {
    try {
      await this.updatePlayerStats(userId, { wordsDrawn: 1 });
    } catch (error) {
      logger.error("Error recording word drawn", {
        error: error.message,
        userId,
      });
    }
  }
}

export default StatsService;
