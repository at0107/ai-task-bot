'use client';

import { STATUSES } from '../lib/status';

function formatTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function authorName(user) {
  if (!user) return null;
  return user.username ? `@${user.username}` : user.firstName;
}

export default function TaskCard({ task, isFresh, onMove }) {
  const author = authorName(task.user);

  return (
    <article
      className={`card${isFresh ? ' card--fresh' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <p className="card__text">{task.text}</p>

      <div className="card__meta">
        <span className={`badge badge--${task.source.toLowerCase()}`}>{task.source}</span>
        <span>#{task.id}</span>
        {author && <span>{author}</span>}
        <time dateTime={task.createdAt}>{formatTime(task.createdAt)}</time>
      </div>

      <div className="toggle" role="group" aria-label={`Status of task ${task.id}`}>
        {STATUSES.map((status) => (
          <button
            key={status.value}
            type="button"
            className={`toggle__btn toggle__btn--${status.value}`}
            aria-pressed={task.status === status.value}
            onClick={() => task.status !== status.value && onMove(task.id, status.value)}
          >
            {status.label}
          </button>
        ))}
      </div>
    </article>
  );
}
