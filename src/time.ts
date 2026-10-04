export function localInput(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function parseLocal(value: string): number {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time) || localInput(time) !== value)
    throw new Error(
      "This local time does not exist. Check the date and daylight saving change.",
    );
  if (localInput(time + 3_600_000) === value)
    throw new Error(
      "This time occurs twice during daylight saving. Choose a time outside the repeated hour; quick-add uses the exact current instant.",
    );
  return time;
}
export function clock(time: number) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(time);
}
export function dayTime(time: number, now = Date.now()) {
  const date = new Date(time),
    today = new Date(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const prefix =
    date.toDateString() === today.toDateString()
      ? "Today"
      : date.toDateString() === tomorrow.toDateString()
        ? "Tomorrow"
        : new Intl.DateTimeFormat("en-AU", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }).format(date);
  return `${prefix} · ${clock(time)}`;
}
export function roundedTime(time: number) {
  return Math.ceil(time / (15 * 60_000)) * 15 * 60_000;
}
