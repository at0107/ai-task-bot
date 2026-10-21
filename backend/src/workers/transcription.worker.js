const { Worker, UnrecoverableError } = require('bullmq');
const { Emitter } = require('@socket.io/redis-emitter');

const { createRedis } = require('../redis');
const { TRANSCRIPTION_QUEUE, notificationQueue } = require('../queues');
const { downloadFile } = require('../services/telegram');
const { transcribe, NoSpeechError } = require('../services/transcription');
const { createTask } = require('../services/tasks');

const CONCURRENCY = 5;

const emitter = new Emitter(createRedis());

function failureMessage(err) {
  if (err instanceof NoSpeechError) {
    return "I couldn't hear any speech in that voice message. Try again or send it as text.";
  }
  return "Sorry, I couldn't transcribe that voice message. Please try again or send it as text.";
}

async function announce(task, { chatId, statusMessageId }) {
  try {
    emitter.emit('newTask', task);
    await notificationQueue.add('notify', {
      chatId,
      messageId: statusMessageId,
      text: `Task #${task.id} added: "${task.text}"`,
    });
  } catch (err) {
    console.error(`Task ${task.id} saved but announcing it failed:`, err.message);
  }
}

async function processTranscription(job) {
  const { fileId, from } = job.data;

  const audio = await downloadFile(fileId);
  const text = await transcribe(audio);
  const task = await createTask({ from, text, source: 'Voice' });

  await announce(task, job.data);
  return { taskId: task.id };
}

function isFinalFailure(job, err) {
  return err instanceof UnrecoverableError || job.attemptsMade >= job.opts.attempts;
}

function createTranscriptionWorker() {
  const worker = new Worker(TRANSCRIPTION_QUEUE, processTranscription, {
    connection: createRedis(),
    concurrency: CONCURRENCY,
  });

  worker.on('completed', (job) => {
    console.log(`transcription job ${job.id} done`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`transcription job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
    if (!job || !isFinalFailure(job, err)) return;

    try {
      await notificationQueue.add('notify', {
        chatId: job.data.chatId,
        messageId: job.data.statusMessageId,
        text: failureMessage(err),
      });
    } catch (queueErr) {
      console.error('Could not queue the failure notification:', queueErr.message);
    }
  });

  worker.on('error', (err) => console.error('transcription worker error:', err.message));

  return worker;
}

module.exports = { createTranscriptionWorker };
