require('dotenv').config();

const required = ['DATABASE_URL', 'BOT_TOKEN', 'GROQ_API_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env variables: ${missing.join(', ')}`);
  console.error('Fill them in backend/.env (see .env.example)');
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 4000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  botToken: process.env.BOT_TOKEN,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  groqApiKey: process.env.GROQ_API_KEY,
  whisperModel: process.env.WHISPER_MODEL || 'whisper-large-v3-turbo',
  maxVoiceSeconds: Number(process.env.MAX_VOICE_SECONDS) || 300,
};
