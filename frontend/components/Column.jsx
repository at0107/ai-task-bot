'use client';

import { useState } from 'react';
import TaskCard from './TaskCard';

export default function Column({ status, tasks, freshIds, onMove }) {
  const [isOver, setIsOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setIsOver(false);

    const id = Number(e.dataTransfer.getData('text/plain'));
    const dropped = tasks.every((t) => t.id !== id);
    if (id && dropped) onMove(id, status.value);
  }

  return (
    <section
      className={`column column--${status.value}${isOver ? ' column--over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      <header className="column__header">
        <h2>{status.label}</h2>
        <span className="column__count">{tasks.length}</span>
      </header>

      <div className="column__body">
        {tasks.length === 0 ? (
          <p className="column__empty">No tasks here</p>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} isFresh={freshIds.has(task.id)} onMove={onMove} />
          ))
        )}
      </div>
    </section>
  );
}
