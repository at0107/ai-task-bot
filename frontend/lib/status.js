export const STATUSES = [
  { value: 'Pending', label: 'Pending' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
];

export function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}
