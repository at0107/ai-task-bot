const { Telegram } = require('telegraf');
const { UnrecoverableError } = require('bullmq');
const config = require('../config');

const DOWNLOAD_TIMEOUT_MS = 30_000;

const telegram = new Telegram(config.botToken);

async function downloadFile(fileId) {
  let url;
  try {
    url = await telegram.getFileLink(fileId);
  } catch (err) {
    if (err.response?.error_code === 400) {
      throw new UnrecoverableError(`Telegram rejected the file: ${err.message}`);
    }
    throw err;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Telegram file download failed with status ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function showMessage({ chatId, messageId, text }) {
  if (messageId) {
    try {
      await telegram.editMessageText(chatId, messageId, undefined, text);
      return;
    } catch (err) {
      if (err.response?.error_code === 429) throw err;
    }
  }
  await telegram.sendMessage(chatId, text);
}

module.exports = { telegram, downloadFile, showMessage };
