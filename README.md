# AI Task Bot

Create tasks by sending a text or a voice message to a Telegram bot, and watch them show up on a web board in real time.

## What it does

- Text message to the bot: saved as a task straight away.
- Voice message to the bot: transcribed with Whisper (through Groq), then saved as a task.
- The dashboard is a Kanban board (Pending, In Progress, Completed). New tasks appear live, and you can change a status with the buttons on a card or by dragging it to another column.

## Architecture

```
                    Telegram
                       |
                  +----v-----+       jobs        +-----------+
                  |   api    |-----------------> |   Redis   |
                  | Express  |                   | (BullMQ)  |
                  | Telegraf |                   +-----+-----+
                  | Socket.io|                         |
                  +--+----+--+                  +------v------+
                     |    ^                     |   worker    |
          REST + WS  |    |  Socket.io          | transcribe  |
                     |    +---- via Redis ------+ notify      |
                +----v---+                      +------+------+
                |  web   |                             |
                | Next.js|                  Groq Whisper, Telegram
                +--------+
                     both api and worker write to PostgreSQL
```

| Service    | What it does |
|------------|--------------|
| `web`      | Next.js dashboard |
| `api`      | REST API, Socket.io, and the Telegram bot (long polling) |
| `worker`   | Processes the Redis queues: transcription and Telegram notifications |
| `postgres` | Tasks and users (Prisma) |
| `redis`    | BullMQ queues, and the channel that carries socket events from the worker to the api |
| `migrate`  | Runs `prisma migrate deploy` once, before the api and worker start |

## How a voice message flows

1. The bot receives the voice message and replies "Transcribing your voice message..." right away, so the user knows something is happening.
2. It adds a job to the `transcription` queue. The job id is built from the chat and message id, so a message Telegram delivers twice is only processed once.
3. The worker downloads the audio, sends it to Whisper, saves the task and emits `newTask` to the dashboard.
4. It adds a job to the `notification` queue, and the notification worker edits the "Transcribing..." message into "Task #N added".

Transcription and notification are separate queues on purpose. If Telegram is down when we reply, only the reply is retried. We never pay for the same transcription twice.

## Error handling for voice

- Network errors, rate limits (429) and 5xx from Groq: retried 3 times with exponential backoff.
- Permanent errors (other 4xx, bad file, silent audio): not retried. The user gets a clear message right away.
- Voice messages longer than 5 minutes are rejected before anything is queued.
- Telegram notifications are retried 5 times for temporary errors, and dropped on permanent ones (chat not found, bot blocked).
- If a task is saved but announcing it fails, the error is logged and the job is not retried, which would create a duplicate task.

## Run it with Docker

You need Docker, a Telegram bot token and a Groq API key.

1. Get a bot token from [@BotFather](https://t.me/BotFather) (`/newbot`).
2. Get a free key at https://console.groq.com/keys.
3. Create the env file and fill it in:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Set `BOT_TOKEN` and `GROQ_API_KEY`. The database and Redis addresses are overridden by `docker-compose.yml`, so you can leave them as they are.
4. Start everything:
   ```bash
   docker compose up --build
   ```
5. Open http://localhost:3000 and message your bot.

Only one copy of the bot can run per token. Stop any local `npm run dev` before using Docker, or Telegram will return a 409 conflict.

## Run it locally (for development)

```bash
docker compose up -d postgres redis

cd backend
cp .env.example .env          # fill in BOT_TOKEN and GROQ_API_KEY
npm install
npx prisma migrate dev
npm run dev                   # api + bot, in one terminal
npm run worker:dev            # worker, in a second terminal

cd ../frontend
npm install
npm run dev                   # dashboard on http://localhost:3000
```

## Configuration (backend/.env)

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | |
| `BOT_TOKEN` | | From BotFather |
| `GROQ_API_KEY` | | For Whisper |
| `WHISPER_MODEL` | `whisper-large-v3-turbo` | Any Whisper model Groq offers |
| `MAX_VOICE_SECONDS` | `300` | Longer voice messages are rejected |
| `PORT` | `4000` | |
| `CLIENT_URL` | `http://localhost:3000` | Allowed CORS origin |

The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). Next.js bakes it in at build time, so it is a build argument in the compose file.

## API

| Method | Path | |
|--------|------|-|
| GET | `/api/tasks` | All tasks, newest first |
| PATCH | `/api/tasks/:id` | Body `{ "status": "Pending" \| "InProgress" \| "Completed" }` |
| GET | `/health` | Health check |

Socket.io events sent to the dashboard: `newTask`, `taskUpdated`.

## Project layout

```
backend/
  prisma/              schema and migrations
  src/
    server.js          api entry point
    worker.js          worker entry point
    bot.js             Telegram handlers
    queues.js          BullMQ queues
    routes/            REST routes
    services/          tasks, transcription, telegram
    workers/           transcription and notification workers
frontend/
  app/                 Next.js app router
  components/          Board, Column, TaskCard
  hooks/useTasks.js    data loading, socket events, optimistic updates
```

## Decisions and trade-offs

- **Groq instead of OpenAI for Whisper.** It is much faster and has a free tier, which helps the transcription feedback time. It exposes the OpenAI API, so switching back is a change of `baseURL` and key in `services/transcription.js`.
- **The worker is a separate process.** Socket events from it reach the dashboard through the Socket.io Redis adapter and emitter, so the api and worker can be scaled independently.
- **Status values.** The database stores `In Progress` with a space (Prisma `@map`), the code and API use `InProgress`.
- **Text messages skip the queue.** Saving a row is fast, and the queue only adds delay there.

## What I would add next

- Authentication on the dashboard and per-user boards.
- Tests for the services and the worker.
- A dead-letter view for jobs that fail permanently.
- Webhooks instead of long polling for the bot in production.
