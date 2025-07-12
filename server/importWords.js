import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Database } from '@sqlitecloud/drivers';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importWordsFromCSV() {
  let db;
  
  try {
    // Connect to SQLite Cloud
    const connectionString = process.env.SQLITECLOUD_CONNECTION_STRING;
    
    if (!connectionString) {
      throw new Error('SQLITECLOUD_CONNECTION_STRING environment variable is required');
    }
    
    console.log('🔗 Connecting to SQLite Cloud...');
    db = new Database(connectionString);
    console.log('✅ Connected to SQLite Cloud successfully!');
    
    console.log('🗑️  Clearing existing words...');
    // Clear existing words
    await db.sql`DELETE FROM words`;
    console.log('✅ Existing words cleared');
    
    // Read CSV file
    const csvPath = path.join(__dirname, 'Skribbl-words.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      console.log('📁 Please ensure Skribbl-words.csv is in the server directory');
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV (skip header row)
    const lines = csvContent.split('\n').slice(1);
    const words = [];
    
    for (const line of lines) {
      if (line.trim()) {
        // Split by comma and get the first column (word)
        const columns = line.split(',');
        const word = columns[0]?.trim();
        
        // More strict validation for words
        if (word && 
            word !== '' && 
            word !== 'word' && 
            word.length > 0 && 
            word.length <= 50 && // Reasonable max length
            /^[a-zA-Z0-9\s\-'.&/]+$/.test(word)) { // Allow letters, numbers, spaces, hyphens, apostrophes, ampersands, slashes
          words.push(word);
        }
      }
    }
    
    // Remove duplicates
    const uniqueWords = [...new Set(words)];
    console.log(`📝 Found ${uniqueWords.length} unique valid words to import`);
    
    // Insert words into database one by one with better error handling
    let imported = 0;
    let skipped = 0;
    
    for (let i = 0; i < uniqueWords.length; i++) {
      const word = uniqueWords[i];
      
      try {
        // Use template literal syntax for SQLite Cloud
        await db.sql`INSERT INTO words (word, difficulty) VALUES (${word}, 'medium')`;
        imported++;
        
        // Show progress every 100 words
        if ((imported + skipped) % 100 === 0) {
          console.log(`📥 Processed ${imported + skipped}/${uniqueWords.length} words (${imported} imported, ${skipped} skipped)...`);
        }
      } catch (error) {
        skipped++;
        console.warn(`⚠️  Skipping word "${word}": ${error.message}`);
      }
    }
    
    console.log(`🎉 Successfully imported ${imported} words!`);
    if (skipped > 0) {
      console.log(`⏭️  Skipped ${skipped} invalid/duplicate words`);
    }
    
    // Verify import
    const countResult = await db.sql`SELECT COUNT(*) as count FROM words`;
    const count = countResult[0].count;
    console.log(`📊 Total words in database: ${count}`);
    
    // Show some sample words
    const sampleResult = await db.sql`SELECT word FROM words ORDER BY RANDOM() LIMIT 5`;
    console.log('🎲 Sample words:', sampleResult.map(row => row.word).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing words:', error);
    process.exit(1);
  }
}

// Run the import
importWordsFromCSV();