const { Queue } = require('bullmq');
const { createRedis } = require('./redis');

const TRANSCRIPTION_QUEUE = 'transcription';
const NOTIFICATION_QUEUE = 'notification';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600 },
};

function createQueue(name, options = {}) {
  const queue = new Queue(name, {
    connection: createRedis(),
    defaultJobOptions: { ...defaultJobOptions, ...options },
  });
  queue.on('error', (err) => console.error(`Queue ${name} error:`, err.message));
  return queue;
}

const transcriptionQueue = createQueue(TRANSCRIPTION_QUEUE);
const notificationQueue = createQueue(NOTIFICATION_QUEUE, { attempts: 5 });

module.exports = {
  TRANSCRIPTION_QUEUE,
  NOTIFICATION_QUEUE,
  transcriptionQueue,
  notificationQueue,
};
