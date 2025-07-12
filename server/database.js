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

// Initialize database connection
async function connectToDatabase() {
  try {
    console.log("🔗 Connecting to SQLite Cloud...");
    db = new Database(connectionString);
    console.log("✅ Connected to SQLite Cloud successfully!");
    return db;
  } catch (error) {
    console.error("❌ Error connecting to SQLite Cloud:", error);
    throw error;
  }
}

// Initialize database tables
export async function initDatabase() {
  try {
    if (!db) {
      await connectToDatabase();
    }

    console.log("🏗️  Creating database tables...");

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

    console.log("✅ Database tables created successfully");

    // Check if words need to be imported from CSV
    const wordCountResult = await db.sql`SELECT COUNT(*) as count FROM words`;
    const wordCount = wordCountResult[0].count;

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

// Get database instance
export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export default db;
