const OpenAI = require('openai');
const { UnrecoverableError } = require('bullmq');
const config = require('../config');

class NoSpeechError extends UnrecoverableError {
  constructor() {
    super('No speech detected in the audio');
    this.name = 'NoSpeechError';
  }
}

const client = new OpenAI({
  apiKey: config.groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
  timeout: 60_000,
  maxRetries: 0,
});

function isPermanentApiError(err) {
  return err instanceof OpenAI.APIError && err.status >= 400 && err.status < 500 && err.status !== 429;
}

async function transcribe(audio) {
  const file = await OpenAI.toFile(audio, 'voice.ogg');

  let result;
  try {
    result = await client.audio.transcriptions.create({
      file,
      model: config.whisperModel,
      response_format: 'json',
    });
  } catch (err) {
    if (isPermanentApiError(err)) {
      throw new UnrecoverableError(`Transcription rejected: ${err.message}`);
    }
    throw err;
  }

  const text = result.text.trim();
  if (!text) throw new NoSpeechError();

  return text;
}

module.exports = { transcribe, NoSpeechError };
