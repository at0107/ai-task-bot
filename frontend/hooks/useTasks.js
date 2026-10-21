'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTasks, updateTaskStatus } from '../lib/api';
import { createSocket } from '../lib/socket';

const HIGHLIGHT_MS = 4000;

function upsert(tasks, task) {
  const exists = tasks.some((t) => t.id === task.id);
  if (!exists) return [task, ...tasks];
  return tasks.map((t) => (t.id === task.id ? task : t));
}

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [freshIds, setFreshIds] = useState(() => new Set());
  const timers = useRef(new Set());

  const markFresh = useCallback((id) => {
    setFreshIds((prev) => new Set(prev).add(id));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, HIGHLIGHT_MS);
    timers.current.add(timer);
  }, []);

  const load = useCallback(async () => {
    try {
      setTasks(await fetchTasks());
      setError(null);
    } catch (err) {
      setError(`Could not load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const socket = createSocket();
    let hasConnectedBefore = false;

    socket.on('connect', () => {
      setConnected(true);
      if (hasConnectedBefore) load();
      hasConnectedBefore = true;
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('newTask', (task) => {
      setTasks((prev) => upsert(prev, task));
      markFresh(task.id);
    });
    socket.on('taskUpdated', (task) => setTasks((prev) => upsert(prev, task)));

    const pendingTimers = timers.current;
    return () => {
      socket.disconnect();
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
    };
  }, [load, markFresh]);

  const moveTask = useCallback(async (id, status) => {
    let previous;
    setTasks((prev) => {
      previous = prev;
      return prev.map((t) => (t.id === id ? { ...t, status } : t));
    });

    try {
      await updateTaskStatus(id, status);
      setError(null);
    } catch (err) {
      setTasks(previous);
      setError(`Could not update task #${id}: ${err.message}`);
    }
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return { tasks, loading, error, connected, freshIds, moveTask, dismissError };
}
