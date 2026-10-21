const config = require('./config');
const prisma = require('./db');
const { transcriptionQueue, notificationQueue } = require('./queues');
const { createTranscriptionWorker } = require('./workers/transcription.worker');
const { createNotificationWorker } = require('./workers/notification.worker');

const transcriptionWorker = createTranscriptionWorker();
const notificationWorker = createNotificationWorker();

console.log(`Workers running (redis: ${config.redisUrl})`);

async function shutdown(signal) {
  console.log(`${signal} received, finishing running jobs`);
  await Promise.all([transcriptionWorker.close(), notificationWorker.close()]);
  await Promise.all([transcriptionQueue.close(), notificationQueue.close()]);
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
