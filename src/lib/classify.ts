import { questions, stateBudget, NEEDS_HUMAN_AT, isCategory } from "./rubric";
import {
  CATEGORIES,
  PRIORITIES,
  type Category,
  type Classification,
  type Config,
  type Email,
  type Priority,
  type SystemOneRequest,
} from "./types";

type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};

type ScoreAnswer = {
  type: "score";
  score: number;
  confidence?: number;
  probabilities?: Record<string, number>;
};

type NoulAnswer = {
  type: "noul";
  noul: number;
  confidence?: number;
};

type SystemOneResponse = {
  model: string;
  answers: {
    category?: ChoiceAnswer;
    priority?: ScoreAnswer;
    needs_human?: NoulAnswer;
  };
};

export function emailState(email: Email, model: string): { state: string; truncated: boolean } {
  const lines = [`Mailbox: faculty or office staff`, `From: ${email.from}`, `Subject: ${email.subject}`];
  if (email.date) lines.push(`Date: ${email.date}`);
  const header = lines.join("\n");
  const body = email.body.trim();
  const room = Math.max(0, stateBudget(model) - header.length - 2);
  const truncated = body.length > room;
  const clipped = truncated ? body.slice(0, room) : body;
  return { state: `${header}\n\n${clipped}`, truncated };
}

export function buildRequest(email: Email, model: string): { request: SystemOneRequest; truncated: boolean } {
  const { state, truncated } = emailState(email, model);
  return { request: { model, state, questions: questions() }, truncated };
}

export function endpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/v1/systemone")) return trimmed;
  return `${trimmed}/v1/systemone`;
}

function argmax(probabilities: Record<string, number> | undefined): string | undefined {
  let best: string | undefined;
  let score = -Infinity;
  if (!probabilities) return undefined;
  for (const [key, value] of Object.entries(probabilities)) {
    if (typeof value === "number" && value > score) {
      score = value;
      best = key;
    }
  }
  return best;
}

function priorityFromScore(answer: ScoreAnswer): { priority: Priority; probabilities: Record<Priority, number> } {
  const probabilities = Object.fromEntries(PRIORITIES.map((label) => [label, 0])) as Record<Priority, number>;
  const raw = answer.probabilities ?? {};
  for (const [index, label] of PRIORITIES.entries()) {
    const value = raw[String(index)] ?? raw[label];
    if (typeof value === "number") probabilities[label] = value;
  }
  const peaked = argmax(probabilities);
  if (peaked && probabilities[peaked as Priority] > 0) {
    return { priority: peaked as Priority, probabilities };
  }
  const rounded = Math.min(PRIORITIES.length - 1, Math.max(0, Math.round(answer.score)));
  return { priority: PRIORITIES[rounded] ?? "normal", probabilities };
}

export function parseClassification(response: SystemOneResponse, truncated: boolean): Classification {
  const categoryAnswer = response.answers.category;
  const priorityAnswer = response.answers.priority;
  const humanAnswer = response.answers.needs_human;
  if (!categoryAnswer || categoryAnswer.type !== "choice") {
    throw new Error("Classifier response is missing the category choice.");
  }
  if (!priorityAnswer || priorityAnswer.type !== "score") {
    throw new Error("Classifier response is missing the priority score.");
  }
  if (!humanAnswer || humanAnswer.type !== "noul" || typeof humanAnswer.noul !== "number") {
    throw new Error("Classifier response is missing the needs_human answer.");
  }
  if (!isCategory(categoryAnswer.choice)) {
    throw new Error(`Classifier returned an unknown category: ${categoryAnswer.choice}`);
  }
  const category = categoryAnswer.choice;
  const { priority, probabilities } = priorityFromScore(priorityAnswer);
  const categoryProbabilities: Record<string, number> = {};
  for (const label of CATEGORIES) {
    const value = categoryAnswer.probabilities?.[label];
    if (typeof value === "number") categoryProbabilities[label] = value;
  }
  return {
    category,
    category_confidence: categoryAnswer.confidence ?? categoryAnswer.probabilities?.[category] ?? 0,
    category_probabilities: categoryProbabilities,
    priority,
    priority_score: priorityAnswer.score,
    priority_confidence: priorityAnswer.confidence ?? 0,
    priority_probabilities: probabilities,
    needs_human: humanAnswer.noul >= NEEDS_HUMAN_AT,
    needs_human_probability: humanAnswer.noul,
    model: response.model,
    truncated,
  };
}

export function assertEmail(value: unknown): Email {
  if (!value || typeof value !== "object") throw new Error("Email must be a JSON object.");
  const record = value as Record<string, unknown>;
  for (const field of ["from", "subject", "body"] as const) {
    if (typeof record[field] !== "string" || record[field].trim() === "") {
      throw new Error(`Email is missing a non-empty "${field}" string.`);
    }
  }
  if (record.date !== undefined && typeof record.date !== "string") {
    throw new Error('Email "date" must be a string when it is present.');
  }
  return {
    from: record.from as string,
    subject: record.subject as string,
    body: record.body as string,
    date: record.date as string | undefined,
  };
}

/** Accept a bare email or a fixture shaped as `{ email, expect }`. */
export function unwrapEmail(value: unknown): Email {
  if (value && typeof value === "object" && "email" in value) {
    return assertEmail((value as { email: unknown }).email);
  }
  return assertEmail(value);
}

export async function classify(email: Email, config: Config, fetchImpl: typeof fetch = fetch): Promise<Classification> {
  if (!config.apiKey.trim()) {
    throw new Error("Set TYPESAFE_API_KEY. The classifier does not ship with a key.");
  }
  const { request, truncated } = buildRequest(email, config.model);
  const response = await fetchImpl(endpoint(config.baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 422 && text.includes("STATE_TRUNCATED")) {
      throw new Error(
        "This email is too long for the selected model. Laya reads only the opening of a message; jev-latest can take a full email.",
      );
    }
    throw new Error(`Classifier request failed (${response.status}): ${text.slice(0, 400)}`);
  }
  let parsed: SystemOneResponse;
  try {
    parsed = JSON.parse(text) as SystemOneResponse;
  } catch {
    throw new Error("Classifier returned a response that is not JSON.");
  }
  return parseClassification(parsed, truncated);
}

export type { Category };
