const prisma = require('../db');

const taskInclude = {
  user: { select: { username: true, firstName: true } },
};

async function createTask({ from, text, source }) {
  const user = await prisma.user.upsert({
    where: { telegramId: String(from.id) },
    update: { username: from.username ?? null, firstName: from.first_name ?? null },
    create: {
      telegramId: String(from.id),
      username: from.username ?? null,
      firstName: from.first_name ?? null,
    },
  });

  return prisma.task.create({
    data: { text, source, userId: user.id },
    include: taskInclude,
  });
}

function listTasks() {
  return prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
    include: taskInclude,
  });
}

function updateTaskStatus(id, status) {
  return prisma.task.update({
    where: { id },
    data: { status },
    include: taskInclude,
  });
}

module.exports = { createTask, listTasks, updateTaskStatus };
