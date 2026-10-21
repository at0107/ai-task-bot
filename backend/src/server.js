const config = require('./config');

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const prisma = require('./db');
const { createRedis } = require('./redis');
const { transcriptionQueue, notificationQueue } = require('./queues');
const { createBot } = require('./bot');
const { createTasksRouter } = require('./routes/tasks');

const { port: PORT, clientUrl: CLIENT_URL } = config;

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const server = http.createServer(app);
const pubClient = createRedis();
const subClient = pubClient.duplicate();
const io = new Server(server, {
  cors: { origin: CLIENT_URL },
  adapter: createAdapter(pubClient, subClient),
});

io.on('connection', (socket) => {
  console.log('dashboard connected:', socket.id);
  socket.on('disconnect', () => console.log('dashboard disconnected:', socket.id));
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/tasks', createTasksRouter(io));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const bot = createBot({ token: config.botToken, io });

async function start() {
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('Cannot connect to the database. Is Postgres running? (docker compose up -d)');
    console.error(err.message);
    process.exit(1);
  }

  await new Promise((resolve) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Another copy of the server is probably running.`);
      } else {
        console.error('Server failed to start:', err);
      }
      process.exit(1);
    });
    server.listen(PORT, resolve);
  });
  console.log(`API listening on :${PORT}`);

  bot.launch().catch((err) => {
    if (err.response?.error_code === 409) {
      console.error('Telegram says another instance is using this bot token. Stop the other copy first.');
    } else {
      console.error('Bot failed to start:', err);
    }
    process.exit(1);
  });
  console.log('Telegram bot started');
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  bot.stop(signal);
  io.close();
  server.close();
  await Promise.all([transcriptionQueue.close(), notificationQueue.close()]);
  pubClient.disconnect();
  subClient.disconnect();
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start();
