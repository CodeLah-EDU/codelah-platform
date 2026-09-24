export const isId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function resourceLink(value: string): string | null {
  if (!value.trim()) return null;
  if (value.length > 2000) throw new Error('Resource link is too long.');
  const url = new URL(value.trim());
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password
  )
    throw new Error('Use an http or https resource link.');
  return url.href;
}
export function singaporeInstant(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('Choose a valid Singapore date and time.');
  const date = new Date(`${value}:00+08:00`);
  if (
    !Number.isFinite(date.valueOf()) ||
    new Date(date.valueOf() + 8 * 3600000).toISOString().slice(0, 16) !== value
  )
    throw new Error('Choose a valid Singapore date and time.');
  return date;
}
export function lessonTimes(start: string, end: string) {
  const starts = singaporeInstant(start),
    ends = singaporeInstant(end);
  const minutes = (ends.valueOf() - starts.valueOf()) / 60000;
  if (minutes < 90 || minutes > 120)
    throw new Error('Lessons must last 90–120 minutes.');
  return { starts_at: starts.toISOString(), ends_at: ends.toISOString() };
}
export function lessonDate(value: string) {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
export function lessonTime(start: string, end: string) {
  const format = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${format.format(new Date(start))}–${format.format(new Date(end))} SGT`;
}
