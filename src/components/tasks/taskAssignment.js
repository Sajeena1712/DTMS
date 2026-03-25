export function parseEmailList(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[\n,;]+/)
        .map((item) => item.trim());

  return [...new Set(items.map((item) => item.toLowerCase()).filter(Boolean))];
}
