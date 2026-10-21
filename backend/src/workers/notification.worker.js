const { Worker, UnrecoverableError } = require('bullmq');

const { createRedis } = require('../redis');
const { NOTIFICATION_QUEUE } = require('../queues');
const { showMessage } = require('../services/telegram');

const CONCURRENCY = 10;

function isPermanentTelegramError(err) {
  const code = err.response?.error_code;
  return code >= 400 && code < 500 && code !== 429;
}

async function processNotification(job) {
  try {
    await showMessage(job.data);
  } catch (err) {
    if (isPermanentTelegramError(err)) {
      throw new UnrecoverableError(err.message);
    }
    throw err;
  }
}

function createNotificationWorker() {
  const worker = new Worker(NOTIFICATION_QUEUE, processNotification, {
    connection: createRedis(),
    concurrency: CONCURRENCY,
  });

  worker.on('failed', (job, err) => {
    console.error(`notification job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  worker.on('error', (err) => console.error('notification worker error:', err.message));

  return worker;
}

module.exports = { createNotificationWorker };
