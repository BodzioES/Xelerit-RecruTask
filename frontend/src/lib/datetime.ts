export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** YYYY-MM-DD in the browser's local timezone, for `<input type="date">`. */
export function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** HH:MM in the browser's local timezone, for `<input type="time">`. */
export function localTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function combineLocal(date: string, time: string): Date {
  return new Date(`${date}T${time.length === 5 ? time : `${time}:00`}`);
}

/** Convert a local date/time pair into an ISO-8601 UTC timestamp safely. */
export function toIsoFromLocal(date: string, time: string): string {
  const value = combineLocal(date, time);
  if (Number.isNaN(value.getTime())) return "";
  return value.toISOString();
}

export function addHours(date: string, time: string, hours: number): { date: string; time: string } {
  const value = combineLocal(date, time);
  value.setHours(value.getHours() + hours);
  return { date: localDateValue(value), time: localTimeValue(value) };
}

export function defaultStart(): { date: string; time: string } {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(9, 0, 0, 0);
  return { date: localDateValue(value), time: localTimeValue(value) };
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  return dateTimeFormatter.format(value);
}

export function formatTime(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  return timeFormatter.format(value);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
