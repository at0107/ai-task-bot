const express = require('express');
const { TaskStatus } = require('@prisma/client');

const { listTasks, updateTaskStatus } = require('../services/tasks');

const VALID_STATUSES = Object.values(TaskStatus);

function createTasksRouter(io) {
  const router = express.Router();

  router.get('/', async (_req, res, next) => {
    try {
      res.json(await listTasks());
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    try {
      const task = await updateTaskStatus(id, status);
      io.emit('taskUpdated', task);
      res.json(task);
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Task not found' });
      }
      next(err);
    }
  });

  return router;
}

module.exports = { createTasksRouter };
