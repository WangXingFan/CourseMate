export type QuizQuestion = {
  id: string;
  answer: number;
};

export const QUIZ_QUESTION_IDS = [
  "energy-signal",
  "convolution-shift",
  "step-response",
  "aliasing",
  "nyquist",
  "square-wave",
  "pulse-spectrum",
  "time-constant",
  "damping",
  "right-half-plane",
  "am-bandwidth",
  "imaginary-axis",
] as const;

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  { id: "energy-signal", answer: 0 },
  { id: "convolution-shift", answer: 2 },
  { id: "step-response", answer: 1 },
  { id: "aliasing", answer: 3 },
  { id: "nyquist", answer: 0 },
  { id: "square-wave", answer: 1 },
  { id: "pulse-spectrum", answer: 2 },
  { id: "time-constant", answer: 0 },
  { id: "damping", answer: 1 },
  { id: "right-half-plane", answer: 3 },
  { id: "am-bandwidth", answer: 2 },
  { id: "imaginary-axis", answer: 0 },
];

export const QUIZ_DURATION_SECONDS = 90;
export const QUIZ_SECONDS_PER_QUESTION = 7.5;
