//timer constants organized by mode
export const TIMER_CONSTANTS = {
  DEFAULT: {
    FOCUS_TIME: 25 * 60,
    MIN_FOCUS: 5 * 60,
    MAX_FOCUS: 70 * 60,
  },
  ADHD: {
    MIN_FOCUS: 10 * 60,
    MAX_FOCUS: 30 * 60,
  },
};

export const DEFAULT_FOCUS_TIME = TIMER_CONSTANTS.DEFAULT.FOCUS_TIME;
export const TIME_ADJUSTMENT_STEP = 5 * 60; //5 minutes in seconds

//base break options to avoid duplication
const BASE_BREAK_OPTIONS = [{ label: "Skip Break", duration: 0 }];

//break options for normal mode
export const BREAK_OPTIONS = [
  ...BASE_BREAK_OPTIONS,
  { label: "5 minutes", duration: 5 * 60 },
  { label: "10 minutes", duration: 10 * 60 },
  { label: "15 minutes", duration: 15 * 60 },
  { label: "20 minutes", duration: 20 * 60 },
];

//break options for ADHD mode
export const ADHD_BREAK_OPTIONS = [
  ...BASE_BREAK_OPTIONS,
  { label: "5 minutes", duration: 5 * 60 },
];

//focus duration options for normal mode
export const FOCUS_OPTIONS = [
  { label: "20 minutes", duration: 20 * 60 },
  { label: "25 minutes", duration: 25 * 60 },
  { label: "30 minutes", duration: 30 * 60 },
  { label: "35 minutes", duration: 35 * 60 },
  { label: "40 minutes", duration: 40 * 60 },
  { label: "45 minutes", duration: 45 * 60 },
  { label: "50 minutes", duration: 50 * 60 },
  { label: "55 minutes", duration: 55 * 60 },
  { label: "60 minutes", duration: 60 * 60 },
];

//focus duration options for ADHD mode
export const ADHD_FOCUS_OPTIONS = [
  { label: "10 minutes", duration: 10 * 60 },
  { label: "15 minutes", duration: 15 * 60 },
  { label: "20 minutes", duration: 20 * 60 },
  { label: "25 minutes", duration: 25 * 60 },
  { label: "30 minutes", duration: 30 * 60 },
];

export const DEFAULT_TASKS = [
  "Coding",
  "Writing",
  "Reading",
  "Studying",
  "Designing",
  "Meditating",
  "Planning",
  "Researching",
];

export const CANCEL_TIMEOUT = 10000; //10 seconds before showing skip button
export const MIN_SESSION_FOR_SAVE = 60; //minimum seconds of focus before saving session
