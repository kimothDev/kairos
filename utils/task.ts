export function normalizeTask(task: string | undefined): string {
  return (task || "").trim();
}
