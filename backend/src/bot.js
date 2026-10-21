const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

const config = require('./config');
const { transcriptionQueue } = require('./queues');
const { createTask } = require('./services/tasks');

function createBot({ token, io }) {
  const bot = new Telegraf(token);

  bot.start((ctx) =>
    ctx.reply('Hi! Send me a text or a voice message and I will add it to your task list.')
  );

  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) return;

    try {
      const task = await createTask({ from: ctx.from, text, source: 'Text' });

      io.emit('newTask', task);
      await ctx.reply(`Task #${task.id} added: "${task.text}"`);
    } catch (err) {
      console.error('Failed to save task:', err);
      await ctx.reply('Sorry, I could not save that task. Please try again.');
    }
  });

  bot.on(message('voice'), async (ctx) => {
    const { voice } = ctx.message;

    if (voice.duration > config.maxVoiceSeconds) {
      return ctx.reply(`That voice message is too long, please keep it under ${config.maxVoiceSeconds} seconds.`);
    }

    try {
      const status = await ctx.reply('Transcribing your voice message...');

      await transcriptionQueue.add(
        'transcribe',
        {
          chatId: ctx.chat.id,
          statusMessageId: status.message_id,
          fileId: voice.file_id,
          from: {
            id: ctx.from.id,
            username: ctx.from.username,
            first_name: ctx.from.first_name,
          },
        },
        { jobId: `voice-${ctx.chat.id}-${ctx.message.message_id}` }
      );
    } catch (err) {
      console.error('Failed to queue voice message:', err);
      await ctx.reply('Sorry, I could not process that voice message. Please try again.');
    }
  });

  bot.catch((err, ctx) => {
    console.error(`Bot error for update ${ctx.update.update_id}:`, err);
  });

  return bot;
}

module.exports = { createBot };
