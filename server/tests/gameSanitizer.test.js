// Unit tests for game sanitizer
import {
  sanitizeGameForPlayer,
  canPlayerSeeWord,
  filterChatMessage,
  getPlayersWhoCanSeeWord,
} from "../utils/gameSanitizer.js";

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  ${error.message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message || "Assertion failed"}: expected ${JSON.stringify(
        expected
      )}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || "Expected true, got false");
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error(message || "Expected false, got true");
  }
}

function assertNull(value, message) {
  if (value !== null) {
    throw new Error(message || `Expected null, got ${value}`);
  }
}

console.log("\n=== Running Game Sanitizer Tests ===\n");

// Mock game object
const createMockGame = (overrides = {}) => ({
  id: "game1",
  roomCode: "ABC123",
  status: "playing",
  gamePhase: "drawing",
  currentWord: "elephant",
  hints: "_ _ _ _ _ _ _ _",
  currentDrawer: { id: "drawer1", name: "Drawer" },
  players: [
    { id: "drawer1", name: "Drawer", hasGuessed: false },
    { id: "player2", name: "Player2", hasGuessed: false },
    { id: "player3", name: "Player3", hasGuessed: true },
  ],
  ...overrides,
});

// Tests for canPlayerSeeWord
test("canPlayerSeeWord - drawer can see word", () => {
  const game = createMockGame();
  assertTrue(canPlayerSeeWord(game, "drawer1"));
});

test("canPlayerSeeWord - player who guessed can see word", () => {
  const game = createMockGame();
  assertTrue(canPlayerSeeWord(game, "player3"));
});

test("canPlayerSeeWord - player who hasn't guessed cannot see word", () => {
  const game = createMockGame();
  assertFalse(canPlayerSeeWord(game, "player2"));
});

test("canPlayerSeeWord - everyone can see word when game finished", () => {
  const game = createMockGame({ status: "finished" });
  assertTrue(canPlayerSeeWord(game, "player2"));
});

test("canPlayerSeeWord - everyone can see word in results phase", () => {
  const game = createMockGame({ gamePhase: "results" });
  assertTrue(canPlayerSeeWord(game, "player2"));
});

// Tests for sanitizeGameForPlayer
test("sanitizeGameForPlayer - hides word from non-guesser", () => {
  const game = createMockGame();
  const sanitized = sanitizeGameForPlayer(game, "player2");
  assertNull(sanitized.currentWord, "Word should be hidden");
  assertTrue(sanitized.hints !== null, "Hints should be shown");
});

test("sanitizeGameForPlayer - shows word to drawer", () => {
  const game = createMockGame();
  const sanitized = sanitizeGameForPlayer(game, "drawer1");
  assertEquals(sanitized.currentWord, "elephant", "Drawer should see word");
});

test("sanitizeGameForPlayer - shows word to correct guesser", () => {
  const game = createMockGame();
  const sanitized = sanitizeGameForPlayer(game, "player3");
  assertEquals(
    sanitized.currentWord,
    "elephant",
    "Correct guesser should see word"
  );
});

// Tests for filterChatMessage
test("filterChatMessage - filters exact word match", () => {
  const filtered = filterChatMessage("I think it's elephant", "elephant");
  assertEquals(
    filtered,
    "I think it's ********",
    "Word should be replaced with asterisks"
  );
});

test("filterChatMessage - filters case insensitive", () => {
  const filtered = filterChatMessage("Is it ELEPHANT?", "elephant");
  assertEquals(
    filtered,
    "Is it ********?",
    "Word should be filtered case-insensitively"
  );
});

test("filterChatMessage - doesn't filter partial matches", () => {
  const filtered = filterChatMessage("elephants are big", "elephant");
  assertEquals(
    filtered,
    "elephants are big",
    "Partial matches should not be filtered"
  );
});

test("filterChatMessage - filters multiple occurrences", () => {
  const filtered = filterChatMessage("elephant elephant", "elephant");
  assertEquals(
    filtered,
    "******** ********",
    "Multiple occurrences should be filtered"
  );
});

test("filterChatMessage - handles words with spaces", () => {
  const filtered = filterChatMessage("hot dog is tasty", "hot dog");
  assertEquals(
    filtered,
    "******* is tasty",
    "Words with spaces should be filtered"
  );
});

test("filterChatMessage - handles special characters in word", () => {
  const filtered = filterChatMessage("It's a T-Rex!", "T-Rex");
  assertEquals(
    filtered,
    "It's a *****!",
    "Words with special chars should be filtered"
  );
});

// Tests for getPlayersWhoCanSeeWord
test("getPlayersWhoCanSeeWord - returns drawer and correct guessers", () => {
  const game = createMockGame();
  const players = getPlayersWhoCanSeeWord(game);
  assertEquals(players.length, 2, "Should return 2 players");
  assertTrue(players.includes("drawer1"), "Should include drawer");
  assertTrue(players.includes("player3"), "Should include correct guesser");
  assertFalse(players.includes("player2"), "Should not include non-guesser");
});

test("getPlayersWhoCanSeeWord - handles no correct guessers", () => {
  const game = createMockGame({
    players: [
      { id: "drawer1", name: "Drawer", hasGuessed: false },
      { id: "player2", name: "Player2", hasGuessed: false },
    ],
  });
  const players = getPlayersWhoCanSeeWord(game);
  assertEquals(players.length, 1, "Should only return drawer");
  assertEquals(players[0], "drawer1", "Should be the drawer");
});

test("getPlayersWhoCanSeeWord - handles all players guessed", () => {
  const game = createMockGame({
    players: [
      { id: "drawer1", name: "Drawer", hasGuessed: false },
      { id: "player2", name: "Player2", hasGuessed: true },
      { id: "player3", name: "Player3", hasGuessed: true },
    ],
  });
  const players = getPlayersWhoCanSeeWord(game);
  assertEquals(players.length, 3, "Should return all players");
});

// Edge case tests
test("Edge case - null game returns null", () => {
  const sanitized = sanitizeGameForPlayer(null, "player1");
  assertNull(sanitized, "Should return null for null game");
});

test("Edge case - undefined playerId returns false", () => {
  const game = createMockGame();
  assertFalse(canPlayerSeeWord(game, undefined), "Should return false");
});

test("Edge case - empty word doesn't crash filter", () => {
  const filtered = filterChatMessage("hello world", "");
  assertEquals(filtered, "hello world", "Should return original message");
});

test("Edge case - null word doesn't crash filter", () => {
  const filtered = filterChatMessage("hello world", null);
  assertEquals(filtered, "hello world", "Should return original message");
});

console.log("\n=== Tests Complete ===\n");
