export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function formatDate(value) {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
