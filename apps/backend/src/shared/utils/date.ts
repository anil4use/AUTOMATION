export function formatIsoDate(date: Date = new Date()): string {
  return date.toISOString();
}

export function getCurrentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
