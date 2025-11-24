// Unit tests for validation utilities
import {
  sanitizePlayerName,
  sanitizeChatMessage,
  validateRoomCode,
  validateDrawingData,
  validateGameSettings,
} from "../utils/validation.js";

// Simple test runner
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

// Tests for sanitizePlayerName
test("sanitizePlayerName removes HTML tags", () => {
  const result = sanitizePlayerName("<script>alert('xss')</script>John");
  assertEquals(result, "John", "Should remove HTML tags");
});

test("sanitizePlayerName trims whitespace", () => {
  const result = sanitizePlayerName("  John  ");
  assertEquals(result, "John", "Should trim whitespace");
});

test("sanitizePlayerName limits length to 20 characters", () => {
  const result = sanitizePlayerName("a".repeat(30));
  assertEquals(result.length, 20, "Should limit to 20 characters");
});

test("sanitizePlayerName returns empty string for invalid input", () => {
  assertEquals(sanitizePlayerName(null), "", "Should handle null");
  assertEquals(sanitizePlayerName(undefined), "", "Should handle undefined");
  assertEquals(sanitizePlayerName(123), "", "Should handle numbers");
});

// Tests for sanitizeChatMessage
test("sanitizeChatMessage removes HTML tags", () => {
  const result = sanitizeChatMessage("<b>Hello</b> World");
  assertEquals(result, "Hello World", "Should remove HTML tags");
});

test("sanitizeChatMessage limits length to 200 characters", () => {
  const result = sanitizeChatMessage("a".repeat(300));
  assertEquals(result.length, 200, "Should limit to 200 characters");
});

// Tests for validateRoomCode
test("validateRoomCode accepts valid codes", () => {
  assertTrue(validateRoomCode("ABC123"), "Should accept ABC123");
  assertTrue(validateRoomCode("ABCD"), "Should accept ABCD");
  assertTrue(validateRoomCode("12345678"), "Should accept 12345678");
});

test("validateRoomCode rejects invalid codes", () => {
  assertFalse(validateRoomCode("ABC"), "Should reject too short");
  assertFalse(validateRoomCode("ABCDEFGHI"), "Should reject too long");
  assertFalse(validateRoomCode("abc-123"), "Should reject special chars");
  assertFalse(validateRoomCode(null), "Should reject null");
});

// Tests for validateDrawingData
test("validateDrawingData accepts valid data", () => {
  const validData = {
    x: 100,
    y: 200,
    prevX: 90,
    prevY: 190,
    color: "#FF0000",
    lineWidth: 5,
    type: "draw",
  };
  assertTrue(validateDrawingData(validData), "Should accept valid data");
});

test("validateDrawingData rejects invalid coordinates", () => {
  const invalidData = {
    x: -10,
    y: 200,
    prevX: 90,
    prevY: 190,
    color: "#FF0000",
    lineWidth: 5,
    type: "draw",
  };
  assertFalse(
    validateDrawingData(invalidData),
    "Should reject negative coords"
  );
});

test("validateDrawingData rejects invalid colors", () => {
  const invalidData = {
    x: 100,
    y: 200,
    prevX: 90,
    prevY: 190,
    color: "red",
    lineWidth: 5,
    type: "draw",
  };
  assertFalse(validateDrawingData(invalidData), "Should reject invalid color");
});

test("validateDrawingData rejects invalid type", () => {
  const invalidData = {
    x: 100,
    y: 200,
    prevX: 90,
    prevY: 190,
    color: "#FF0000",
    lineWidth: 5,
    type: "invalid",
  };
  assertFalse(validateDrawingData(invalidData), "Should reject invalid type");
});

// Tests for validateGameSettings
test("validateGameSettings returns defaults for invalid input", () => {
  const result = validateGameSettings(null);
  assertEquals(
    result,
    { drawTime: 80, maxRounds: 3 },
    "Should return defaults"
  );
});

test("validateGameSettings validates drawTime range", () => {
  const result1 = validateGameSettings({ drawTime: 20, maxRounds: 3 });
  assertEquals(result1.drawTime, 80, "Should use default for too low");

  const result2 = validateGameSettings({ drawTime: 400, maxRounds: 3 });
  assertEquals(result2.drawTime, 80, "Should use default for too high");

  const result3 = validateGameSettings({ drawTime: 60, maxRounds: 3 });
  assertEquals(result3.drawTime, 60, "Should accept valid value");
});

test("validateGameSettings validates maxRounds range", () => {
  const result1 = validateGameSettings({ drawTime: 80, maxRounds: 0 });
  assertEquals(result1.maxRounds, 3, "Should use default for too low");

  const result2 = validateGameSettings({ drawTime: 80, maxRounds: 20 });
  assertEquals(result2.maxRounds, 3, "Should use default for too high");

  const result3 = validateGameSettings({ drawTime: 80, maxRounds: 5 });
  assertEquals(result3.maxRounds, 5, "Should accept valid value");
});

console.log("\n=== Running Validation Tests ===\n");
// Run all tests (they're already executed above)
console.log("\n=== Tests Complete ===\n");
