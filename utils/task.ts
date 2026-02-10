export function normalizeTask(task: string | undefined): string {
  const trimmed = (task || "").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
