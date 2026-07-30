import { Queue } from 'bullmq';
import { Redis } from 'ioredis'; // Changed to a named import

// Connect to the local Docker Redis instance
export const redisConnection = new Redis({ // Changed from 'new IORedis' to 'new Redis'
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // Strict requirement for BullMQ to handle disconnects
});

// Configure the main task pipeline
export const notificationQueue = new Queue('notification-jobs', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Auto-retry up to 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 2000, // Delays: 2s, 4s, 8s...
    },
    removeOnComplete: true, // Auto clean memory when done
  },
});