// Unit tests for rate limiter
import RateLimiter from "../utils/rateLimiter.js";

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  ${error.message}`);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log("\n=== Running Rate Limiter Tests ===\n");

test("RateLimiter allows requests under limit", () => {
  const limiter = new RateLimiter();
  assertTrue(limiter.checkLimit("user1", "action1", 5, 1000));
  assertTrue(limiter.checkLimit("user1", "action1", 5, 1000));
  assertTrue(limiter.checkLimit("user1", "action1", 5, 1000));
});

test("RateLimiter blocks requests over limit", () => {
  const limiter = new RateLimiter();
  for (let i = 0; i < 5; i++) {
    limiter.checkLimit("user2", "action2", 5, 1000);
  }
  assertFalse(limiter.checkLimit("user2", "action2", 5, 1000));
});

test("RateLimiter resets after window", async () => {
  const limiter = new RateLimiter();
  for (let i = 0; i < 3; i++) {
    limiter.checkLimit("user3", "action3", 3, 100);
  }
  assertFalse(limiter.checkLimit("user3", "action3", 3, 100));

  await sleep(150);
  assertTrue(limiter.checkLimit("user3", "action3", 3, 100));
});

test("RateLimiter handles different users independently", () => {
  const limiter = new RateLimiter();
  for (let i = 0; i < 5; i++) {
    limiter.checkLimit("user4", "action4", 5, 1000);
  }
  assertFalse(limiter.checkLimit("user4", "action4", 5, 1000));
  assertTrue(limiter.checkLimit("user5", "action4", 5, 1000));
});

test("RateLimiter handles different actions independently", () => {
  const limiter = new RateLimiter();
  for (let i = 0; i < 5; i++) {
    limiter.checkLimit("user6", "action5", 5, 1000);
  }
  assertFalse(limiter.checkLimit("user6", "action5", 5, 1000));
  assertTrue(limiter.checkLimit("user6", "action6", 5, 1000));
});

test("RateLimiter cleanup removes old entries", async () => {
  const limiter = new RateLimiter();
  limiter.checkLimit("user7", "action7", 5, 100);

  await sleep(200);
  limiter.cleanup();

  // After cleanup, should be able to make requests again
  assertTrue(limiter.checkLimit("user7", "action7", 5, 100));
});

test("RateLimiter reset clears user limits", () => {
  const limiter = new RateLimiter();
  for (let i = 0; i < 5; i++) {
    limiter.checkLimit("user8", "action8", 5, 1000);
  }
  assertFalse(limiter.checkLimit("user8", "action8", 5, 1000));

  limiter.reset("user8");
  assertTrue(limiter.checkLimit("user8", "action8", 5, 1000));
});

console.log("\n=== Tests Complete ===\n");
