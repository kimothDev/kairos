import {
    ADHD_BREAK_OPTIONS,
    ADHD_FOCUS_OPTIONS,
    BREAK_OPTIONS,
    FOCUS_OPTIONS,
} from "@/constants/timer";

export function getFocusOptions(includeShortSessions: boolean) {
  return includeShortSessions ? ADHD_FOCUS_OPTIONS : FOCUS_OPTIONS;
}

export function getBreakOptions(
  includeShortSessions: boolean,
  focusDurationMinutes?: number,
) {
  const options = includeShortSessions ? ADHD_BREAK_OPTIONS : BREAK_OPTIONS;

  if (!focusDurationMinutes) return options;

  // Rule: Max break = Focus duration ÷ 3 (minimum 5 min)
  // Matching services/rl/index.ts logic
  const maxBreak = Math.max(5, Math.floor(focusDurationMinutes / 3));

  return options.filter(
    (opt) => opt.duration === 0 || opt.duration <= maxBreak * 60,
  );
}
