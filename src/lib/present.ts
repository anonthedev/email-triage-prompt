/** A category or priority below this is a weak call, not a decision the label is sure about. */
export const WEAK_AT = 0.5;

export function isWeak(confidence: number): boolean {
  return confidence < WEAK_AT;
}

export function senderName(from: string): string {
  const quoted = from.match(/^\s*"([^"]+)"\s*</);
  if (quoted?.[1]) return quoted[1].trim();
  const named = from.match(/^\s*([^<]+?)\s*</);
  if (named?.[1]) return named[1].trim();
  return from.trim();
}

export function formatWhen(date?: string): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

export function confidenceText(value: number): string {
  return value.toFixed(2);
}
