const Redis = require('ioredis');
const config = require('./config');

function createRedis() {
  const client = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
  client.on('error', (err) => console.error('Redis error:', err.message));
  return client;
}

module.exports = { createRedis };
