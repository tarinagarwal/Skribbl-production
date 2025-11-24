// Message Queue Service - Simple in-memory queue for event processing
import logger from "../utils/logger.js";

class MessageQueue {
  constructor() {
    this.queues = new Map();
    this.handlers = new Map();
    this.processing = new Map();
  }

  // Create a new queue
  createQueue(queueName) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
      this.processing.set(queueName, false);
      logger.info("Queue created", { queueName });
    }
  }

  // Add message to queue
  enqueue(queueName, message) {
    if (!this.queues.has(queueName)) {
      this.createQueue(queueName);
    }

    this.queues.get(queueName).push({
      id: Date.now() + Math.random(),
      data: message,
      timestamp: Date.now(),
      retries: 0,
    });

    // Start processing if not already processing
    if (!this.processing.get(queueName)) {
      this.processQueue(queueName);
    }
  }

  // Register a handler for a queue
  registerHandler(queueName, handler) {
    this.handlers.set(queueName, handler);
    logger.info("Handler registered", { queueName });
  }

  // Process messages in queue
  async processQueue(queueName) {
    const queue = this.queues.get(queueName);
    const handler = this.handlers.get(queueName);

    if (!queue || !handler) {
      return;
    }

    this.processing.set(queueName, true);

    while (queue.length > 0) {
      const message = queue.shift();

      try {
        await handler(message.data);
        logger.debug("Message processed", { queueName, messageId: message.id });
      } catch (error) {
        logger.error("Error processing message", {
          error: error.message,
          queueName,
          messageId: message.id,
        });

        // Retry logic
        if (message.retries < 3) {
          message.retries++;
          queue.push(message);
          logger.info("Message requeued", {
            queueName,
            messageId: message.id,
            retries: message.retries,
          });
        } else {
          logger.error("Message failed after max retries", {
            queueName,
            messageId: message.id,
          });
        }
      }

      // Small delay between messages
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.processing.set(queueName, false);
  }

  // Get queue stats
  getStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    return {
      queueName,
      length: queue.length,
      processing: this.processing.get(queueName),
      hasHandler: this.handlers.has(queueName),
    };
  }

  // Get all queue stats
  getAllStats() {
    const stats = [];
    for (const queueName of this.queues.keys()) {
      stats.push(this.getStats(queueName));
    }
    return stats;
  }

  // Clear a queue
  clearQueue(queueName) {
    if (this.queues.has(queueName)) {
      this.queues.set(queueName, []);
      logger.info("Queue cleared", { queueName });
    }
  }
}

// Create singleton instance
const messageQueue = new MessageQueue();

// Create default queues
messageQueue.createQueue("game-events");
messageQueue.createQueue("stats-updates");
messageQueue.createQueue("notifications");

export default messageQueue;
