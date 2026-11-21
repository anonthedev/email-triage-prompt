import type { Priority } from "./types";

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export type SortableMail = {
  email: { date?: string };
  classification?: {
    priority: Priority;
    needs_human: boolean;
  };
};

function dateMs(date?: string): number {
  if (!date) return 0;
  const parsed = new Date(date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Urgent and high first, then mail that needs a person, then newer mail. Failures sink. */
export function compareTriage(a: SortableMail, b: SortableMail): number {
  if (!a.classification && b.classification) return 1;
  if (a.classification && !b.classification) return -1;
  if (!a.classification || !b.classification) return dateMs(b.email.date) - dateMs(a.email.date);
  const byPriority = PRIORITY_RANK[a.classification.priority] - PRIORITY_RANK[b.classification.priority];
  if (byPriority !== 0) return byPriority;
  const byHuman = Number(b.classification.needs_human) - Number(a.classification.needs_human);
  if (byHuman !== 0) return byHuman;
  return dateMs(b.email.date) - dateMs(a.email.date);
}
