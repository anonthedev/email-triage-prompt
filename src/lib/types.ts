export const CATEGORIES = [
  "advising",
  "grades",
  "scheduling",
  "admin",
  "research",
  "vendor",
  "fyi",
  "urgent",
] as const;

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];

export type Email = {
  from: string;
  subject: string;
  body: string;
  date?: string;
};

export type Config = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type Classification = {
  category: Category;
  category_confidence: number;
  category_probabilities: Record<string, number>;
  priority: Priority;
  priority_score: number;
  priority_confidence: number;
  priority_probabilities: Record<Priority, number>;
  needs_human: boolean;
  needs_human_probability: number;
  model: string;
  truncated: boolean;
};

export type SystemOneRequest = {
  model: string;
  state: string;
  questions: Record<string, unknown>;
};
