// Event Service - Event sourcing for game events
import { getDatabase } from "../database.js";
import logger from "../utils/logger.js";

class EventService {
  async initializeEventTable() {
    try {
      const db = getDatabase();

      await db.sql`
        CREATE TABLE IF NOT EXISTS game_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_data TEXT NOT NULL,
          user_id TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES games(id)
        )
      `;

      // Create index for faster queries
      await db.sql`
        CREATE INDEX IF NOT EXISTS idx_game_events_game_id 
        ON game_events(game_id)
      `;

      logger.info("Event table initialized");
    } catch (error) {
      logger.error("Error initializing event table", { error: error.message });
    }
  }

  async recordEvent(gameId, eventType, eventData, userId = null) {
    try {
      const db = getDatabase();

      const dataJson = JSON.stringify(eventData);

      await db.sql`
        INSERT INTO game_events (game_id, event_type, event_data, user_id)
        VALUES (${gameId}, ${eventType}, ${dataJson}, ${userId})
      `;

      logger.debug("Event recorded", { gameId, eventType, userId });
    } catch (error) {
      logger.error("Error recording event", {
        error: error.message,
        gameId,
        eventType,
      });
    }
  }

  async getGameEvents(gameId) {
    try {
      const db = getDatabase();

      const events = await db.sql`
        SELECT * FROM game_events 
        WHERE game_id = ${gameId}
        ORDER BY timestamp ASC
      `;

      return events.map((event) => ({
        ...event,
        event_data: JSON.parse(event.event_data),
      }));
    } catch (error) {
      logger.error("Error getting game events", {
        error: error.message,
        gameId,
      });
      return [];
    }
  }

  async getEventsByType(gameId, eventType) {
    try {
      const db = getDatabase();

      const events = await db.sql`
        SELECT * FROM game_events 
        WHERE game_id = ${gameId} AND event_type = ${eventType}
        ORDER BY timestamp ASC
      `;

      return events.map((event) => ({
        ...event,
        event_data: JSON.parse(event.event_data),
      }));
    } catch (error) {
      logger.error("Error getting events by type", {
        error: error.message,
        gameId,
        eventType,
      });
      return [];
    }
  }

  async getUserEvents(userId, limit = 100) {
    try {
      const db = getDatabase();

      const events = await db.sql`
        SELECT * FROM game_events 
        WHERE user_id = ${userId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return events.map((event) => ({
        ...event,
        event_data: JSON.parse(event.event_data),
      }));
    } catch (error) {
      logger.error("Error getting user events", {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  // Event types
  static EVENT_TYPES = {
    GAME_CREATED: "game_created",
    PLAYER_JOINED: "player_joined",
    PLAYER_LEFT: "player_left",
    GAME_STARTED: "game_started",
    WORD_SELECTED: "word_selected",
    CORRECT_GUESS: "correct_guess",
    ROUND_END: "round_end",
    GAME_FINISHED: "game_finished",
    PLAYER_KICKED: "player_kicked",
  };
}

export default EventService;
