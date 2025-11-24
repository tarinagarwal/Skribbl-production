// Game Sanitizer - Filter sensitive game data based on player permissions
import logger from "./logger.js";

/**
 * Sanitize game data for a specific player
 * Hides the current word from players who shouldn't see it
 *
 * @param {Object} game - The game object
 * @param {string} playerId - The player's socket ID
 * @returns {Object} - Sanitized game object
 */
export function sanitizeGameForPlayer(game, playerId) {
  if (!game) {
    return null;
  }

  // Create a shallow copy of the game
  const sanitizedGame = { ...game };

  // Determine if player should see the word
  const shouldSeeWord = canPlayerSeeWord(game, playerId);

  if (!shouldSeeWord) {
    // Hide the actual word, show hints instead
    sanitizedGame.currentWord = null;

    // Ensure hints are shown (if in drawing phase)
    if (game.gamePhase === "drawing" && !sanitizedGame.hints) {
      // Generate default hints if not set
      sanitizedGame.hints = game.currentWord
        ? game.currentWord
            .split("")
            .map((char) => (char === " " ? "     " : "_"))
            .join(" ")
        : "";
    }
  }

  return sanitizedGame;
}

/**
 * Determine if a player can see the current word
 *
 * @param {Object} game - The game object
 * @param {string} playerId - The player's socket ID
 * @returns {boolean} - True if player can see the word
 */
export function canPlayerSeeWord(game, playerId) {
  if (!game || !playerId) {
    return false;
  }

  // Game hasn't started or is finished - everyone can see
  if (game.status !== "playing") {
    return true;
  }

  // No word set yet
  if (!game.currentWord) {
    return false;
  }

  // Drawer always sees the word
  if (game.currentDrawer && game.currentDrawer.id === playerId) {
    return true;
  }

  // Player has guessed correctly
  const player = game.players.find((p) => p.id === playerId);
  if (player && player.hasGuessed) {
    return true;
  }

  // During choosing phase, only drawer sees word choices
  if (game.gamePhase === "choosing") {
    return game.currentDrawer && game.currentDrawer.id === playerId;
  }

  // Round has ended - everyone can see
  if (game.gamePhase === "results") {
    return true;
  }

  // Default: hide the word
  return false;
}

/**
 * Filter chat message to hide the word from non-guessers
 *
 * @param {string} message - The chat message
 * @param {string} currentWord - The word to filter
 * @returns {string} - Filtered message
 */
export function filterChatMessage(message, currentWord) {
  if (!currentWord || !message) {
    return message;
  }

  // Create a regex that matches the word (case insensitive, whole word)
  const wordRegex = new RegExp(
    `\\b${currentWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "gi"
  );

  // Replace the word with asterisks
  return message.replace(wordRegex, (match) => "*".repeat(match.length));
}

/**
 * Sanitize game for broadcast to all players
 * Returns a map of playerId -> sanitized game
 *
 * @param {Object} game - The game object
 * @returns {Map} - Map of playerId to sanitized game
 */
export function sanitizeGameForBroadcast(game) {
  if (!game) {
    return new Map();
  }

  const sanitizedGames = new Map();

  // Sanitize for each player
  game.players.forEach((player) => {
    sanitizedGames.set(player.id, sanitizeGameForPlayer(game, player.id));
  });

  return sanitizedGames;
}

/**
 * Get list of players who can see the word
 *
 * @param {Object} game - The game object
 * @returns {Array} - Array of player IDs who can see the word
 */
export function getPlayersWhoCanSeeWord(game) {
  if (!game) {
    return [];
  }

  const playerIds = [];

  // Add drawer
  if (game.currentDrawer) {
    playerIds.push(game.currentDrawer.id);
  }

  // Add players who have guessed correctly
  game.players.forEach((player) => {
    if (player.hasGuessed && player.id !== game.currentDrawer?.id) {
      playerIds.push(player.id);
    }
  });

  return playerIds;
}

/**
 * Log word leak attempt for debugging
 *
 * @param {string} context - Where the leak was prevented
 * @param {string} playerId - Player who would have seen the word
 * @param {string} gameId - Game ID
 */
export function logWordLeakPrevention(context, playerId, gameId) {
  logger.debug("Word leak prevented", {
    context,
    playerId,
    gameId,
  });
}
