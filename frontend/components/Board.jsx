'use client';

import { useTasks } from '../hooks/useTasks';
import { STATUSES } from '../lib/status';
import Column from './Column';

export default function Board() {
  const { tasks, loading, error, connected, freshIds, moveTask, dismissError } = useTasks();

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Task Board</h1>
          <p className="topbar__sub">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} created from Telegram
          </p>
        </div>

        <span className={`live${connected ? ' live--on' : ''}`}>
          <span className="live__dot" />
          {connected ? 'Live' : 'Reconnecting...'}
        </span>
      </header>

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="state">Loading tasks...</p>
      ) : (
        <div className="board">
          {STATUSES.map((status) => (
            <Column
              key={status.value}
              status={status}
              tasks={tasks.filter((t) => t.status === status.value)}
              freshIds={freshIds}
              onMove={moveTask}
            />
          ))}
        </div>
      )}
    </main>
  );
}
