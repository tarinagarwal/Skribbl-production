import { Database } from "@sqlitecloud/drivers";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// SQLite Cloud connection from environment variable
const connectionString = process.env.SQLITECLOUD_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(
    "SQLITECLOUD_CONNECTION_STRING environment variable is required"
  );
}

let db;
let connectionRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Initialize database connection with retry logic
async function connectToDatabase() {
  try {
    console.log("🔗 Connecting to SQLite Cloud...");
    db = new Database(connectionString);

    // Test the connection
    await db.sql`SELECT 1`;

    console.log("✅ Connected to SQLite Cloud successfully!");
    connectionRetries = 0; // Reset retry counter on successful connection
    return db;
  } catch (error) {
    console.error("❌ Error connecting to SQLite Cloud:", error);

    if (connectionRetries < MAX_RETRIES) {
      connectionRetries++;
      console.log(
        `🔄 Retrying connection (${connectionRetries}/${MAX_RETRIES}) in ${RETRY_DELAY}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return connectToDatabase();
    }

    throw error;
  }
}

// Reconnect function for when connection is lost
async function reconnectDatabase() {
  console.log("🔄 Attempting to reconnect to database...");
  try {
    db = null; // Clear existing connection
    await connectToDatabase();
    return db;
  } catch (error) {
    console.error("❌ Failed to reconnect to database:", error);
    throw error;
  }
}

// Execute query with automatic reconnection
async function executeQuery(queryFn) {
  const maxAttempts = 3;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      if (!db) {
        await connectToDatabase();
      }

      return await queryFn(db);
    } catch (error) {
      console.error(`❌ Query attempt ${attempt} failed:`, error.message);

      // Check if it's a connection error
      if (
        error.errorCode === "ERR_CONNECTION_NOT_ESTABLISHED" ||
        error.message.includes("Connection unavailable") ||
        error.message.includes("disconnected")
      ) {
        if (attempt < maxAttempts) {
          console.log(
            `🔄 Reconnecting and retrying (attempt ${
              attempt + 1
            }/${maxAttempts})...`
          );
          try {
            await reconnectDatabase();
            attempt++;
            continue;
          } catch (reconnectError) {
            console.error("❌ Reconnection failed:", reconnectError);
          }
        }
      }

      // If it's not a connection error or we've exhausted retries, throw the error
      if (attempt === maxAttempts) {
        throw error;
      }

      attempt++;
    }
  }
}

// Initialize database tables
export async function initDatabase() {
  try {
    console.log("🏗️  Creating database tables...");

    await executeQuery(async (db) => {
      await db.sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          avatar TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          room_code TEXT UNIQUE NOT NULL,
          owner_id TEXT,
          current_word TEXT,
          current_drawer TEXT,
          round INTEGER DEFAULT 1,
          max_rounds INTEGER DEFAULT 3,
          status TEXT DEFAULT 'waiting',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS game_players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          score INTEGER DEFAULT 0,
          is_drawer BOOLEAN DEFAULT 0,
          FOREIGN KEY (game_id) REFERENCES games(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT NOT NULL UNIQUE,
          difficulty TEXT DEFAULT 'medium'
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          is_guess BOOLEAN DEFAULT 0,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES games(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `;
    });

    console.log("✅ Database tables created successfully");

    // Check if words need to be imported from CSV
    const wordCount = await executeQuery(async (db) => {
      const result = await db.sql`SELECT COUNT(*) as count FROM words`;
      return result[0].count;
    });

    if (wordCount === 0) {
      console.log(
        '📝 No words found in database. Please run "npm run import-words" to import words from CSV file.'
      );
    } else {
      console.log(`📊 Database contains ${wordCount} words`);
    }

    console.log("🎉 SQLite Cloud database initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing SQLite Cloud database:", error);
    throw error;
  }
}

// Get database instance with connection check
export function getDatabase() {
  return {
    sql: async (strings, ...values) => {
      return executeQuery(async (db) => {
        return db.sql(strings, ...values);
      });
    },
  };
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    await executeQuery(async (db) => {
      await db.sql`SELECT 1`;
    });
    return true;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    return false;
  }
}

export default db;
