import { compareTriage } from "./sort";
import type { Category, Priority } from "./types";
import { isWeak } from "./present";

export const SORTS = ["priority", "newest", "oldest", "kind", "least-sure"] as const;

export type SortKey = (typeof SORTS)[number];

export type MailView = {
  category: Category | "";
  priority: Priority | "";
  decision: "" | "person" | "staff";
  weakOnly: boolean;
  sort: SortKey;
};

export const DEFAULT_VIEW: MailView = {
  category: "",
  priority: "",
  decision: "",
  weakOnly: false,
  sort: "priority",
};

export type FilterableMail = {
  email: { date?: string };
  classification?: {
    category: string;
    category_confidence: number;
    priority: Priority;
    priority_confidence: number;
    needs_human: boolean;
  };
};

function dateMs(date?: string): number {
  if (!date) return 0;
  const parsed = new Date(date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function leastSure(row: FilterableMail): number {
  const classification = row.classification;
  if (!classification) return 2;
  return Math.min(classification.category_confidence, classification.priority_confidence);
}

function matches(row: FilterableMail, view: MailView): boolean {
  const classification = row.classification;
  if (!classification) return !view.category && !view.priority && !view.decision && !view.weakOnly;
  if (view.category && classification.category !== view.category) return false;
  if (view.priority && classification.priority !== view.priority) return false;
  if (view.decision === "person" && !classification.needs_human) return false;
  if (view.decision === "staff" && classification.needs_human) return false;
  if (view.weakOnly && !isWeak(classification.category_confidence) && !isWeak(classification.priority_confidence)) return false;
  return true;
}

export function applyMailView<T extends FilterableMail>(rows: readonly T[], view: MailView): T[] {
  const filtered = rows.filter((row) => matches(row, view));
  const sorted = [...filtered];
  if (view.sort === "newest") {
    sorted.sort((a, b) => dateMs(b.email.date) - dateMs(a.email.date));
  } else if (view.sort === "oldest") {
    sorted.sort((a, b) => dateMs(a.email.date) - dateMs(b.email.date));
  } else if (view.sort === "kind") {
    sorted.sort((a, b) => (a.classification?.category ?? "zzz").localeCompare(b.classification?.category ?? "zzz") || compareTriage(a, b));
  } else if (view.sort === "least-sure") {
    sorted.sort((a, b) => leastSure(a) - leastSure(b) || compareTriage(a, b));
  } else {
    sorted.sort(compareTriage);
  }
  return sorted;
}
