// Word Service - Manages word selection and difficulty
import { getDatabase } from "../database.js";
import logger from "../utils/logger.js";

class WordService {
  async getRandomWords(count = 3, difficulty = null) {
    try {
      const db = getDatabase();
      
      let words;
      if (difficulty) {
        words = await db.sql`
          SELECT word FROM words 
          WHERE difficulty = ${difficulty}
          ORDER BY RANDOM() 
          LIMIT ${count}
        `;
      } else {
        words = await db.sql`
          SELECT word FROM words 
          ORDER BY RANDOM() 
          LIMIT ${count}
        `;
      }
      
      return words.map((row) => row.word);
    } catch (error) {
      logger.error("Error getting random words", { error: error.message });
      // Return fallback words
      return ["cat", "dog", "house"];
    }
  }

  async categor izeWordDifficulty(word) {
    // Simple difficulty categorization based on word length and complexity
    const length = word.length;
    const hasSpaces = word.includes(" ");
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(word);
    
    if (length <= 4 && !hasSpaces && !hasSpecialChars) {
      return "easy";
    } else if (length <= 8 && !hasSpecialChars) {
      return "medium";
    } else {
      return "hard";
    }
  }

  async updateWordDifficulties() {
    try {
      const db = getDatabase();
      
      // Get all words without difficulty set
      const words = await db.sql`
        SELECT id, word FROM words WHERE difficulty IS NULL OR difficulty = 'medium'
      `;
      
      for (const wordRow of words) {
        const difficulty = await this.categorizeWordDifficulty(wordRow.word);
        await db.sql`
          UPDATE words SET difficulty = ${difficulty} WHERE id = ${wordRow.id}
        `;
      }
      
      logger.info(`Updated difficulty for ${words.length} words`);
    } catch (error) {
      logger.error("Error updating word difficulties", { error: error.message });
    }
  }

  async addCustomWords(words, difficulty = "medium") {
    try {
      const db = getDatabase();
      
      for (const word of words) {
        try {
          await db.sql`
            INSERT OR IGNORE INTO words (word, difficulty) 
            VALUES (${word.toLowerCase().trim()}, ${difficulty})
          `;
        } catch (error) {
          // Skip duplicates
          logger.debug("Skipped duplicate word", { word });
        }
      }
      
      logger.info(`Added ${words.length} custom words`);
      return true;
    } catch (error) {
      logger.error("Error adding custom words", { error: error.message });
      return false;
    }
  }

  async getWordsByDifficulty(difficulty) {
    try {
      const db = getDatabase();
      
      const words = await db.sql`
        SELECT word FROM words WHERE difficulty = ${difficulty}
      `;
      
      return words.map((row) => row.word);
    } catch (error) {
      logger.error("Error getting words by difficulty", { error: error.message });
      return [];
    }
  }

  async getWordCount() {
    try {
      const db = getDatabase();
      
      const result = await db.sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END) as easy,
          SUM(CASE WHEN difficulty = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END) as hard
        FROM words
      `;
      
      return result[0];
    } catch (error) {
      logger.error("Error getting word count", { error: error.message });
      return { total: 0, easy: 0, medium: 0, hard: 0 };
    }
  }
}

export default WordService;
