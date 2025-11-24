// Rate limiting for socket events

class RateLimiter {
  constructor() {
    this.limits = new Map();
  }

  // Check if action is allowed for a user
  checkLimit(userId, action, maxRequests = 10, windowMs = 1000) {
    const key = `${userId}:${action}`;
    const now = Date.now();

    if (!this.limits.has(key)) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    const limit = this.limits.get(key);

    // Reset if window has passed
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return true;
    }

    // Check if under limit
    if (limit.count < maxRequests) {
      limit.count++;
      return true;
    }

    return false;
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetTime + 60000) {
        // Clean up entries older than 1 minute
        this.limits.delete(key);
      }
    }
  }

  // Reset limits for a user
  reset(userId) {
    for (const key of this.limits.keys()) {
      if (key.startsWith(userId + ":")) {
        this.limits.delete(key);
      }
    }
  }
}

export default RateLimiter;
