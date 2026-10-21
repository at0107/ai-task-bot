export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export function fetchTasks() {
  return request('/api/tasks');
}

export function updateTaskStatus(id, status) {
  return request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
