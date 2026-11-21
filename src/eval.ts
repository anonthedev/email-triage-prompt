import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertEmail, classify } from "./lib/classify";
import { configFromEnv, loadDotEnv } from "./lib/env";
import { isCategory, isPriority } from "./lib/rubric";
import type { Category, Priority } from "./lib/types";

type Expected = {
  category: Category;
  priority: Priority;
  needs_human: boolean;
};

type Fixture = {
  file: string;
  email: ReturnType<typeof assertEmail>;
  expect: Expected;
};

function loadFixtures(dir: string): Fixture[] {
  const files = readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as {
      email?: unknown;
      expect?: Partial<Expected>;
    };
    const expect = raw.expect;
    if (!expect || !expect.category || !isCategory(expect.category) || !expect.priority || !isPriority(expect.priority) || typeof expect.needs_human !== "boolean") {
      throw new Error(`${file} is missing expect.category, expect.priority, and expect.needs_human.`);
    }
    return { file, email: assertEmail(raw.email), expect: expect as Expected };
  });
}

export type EvalRow = {
  file: string;
  mark: "ok" | "miss";
  category: string;
  categoryConfidence: number;
  priority: string;
  priorityConfidence: number;
  needsHuman: boolean;
  needsHumanProbability: number;
  expectedCategory: string;
  expectedPriority: string;
  expectedNeedsHuman: boolean;
};

const HEADERS = ["file", "result", "category", "cat conf", "priority", "pri conf", "needs person", "p(decides)"] as const;

function cell(value: string, width: number): string {
  return value.padEnd(width);
}

function num(value: number): string {
  return value.toFixed(2);
}

/** One row per fixture. cat conf and pri conf are how sure each label is. p(decides) is the probability a person must decide. */
export function formatEval(rows: EvalRow[]): string {
  const body = rows.map((row) => [
    row.file,
    row.mark,
    row.category,
    num(row.categoryConfidence),
    row.priority,
    num(row.priorityConfidence),
    row.needsHuman ? "yes" : "no",
    num(row.needsHumanProbability),
  ]);
  const widths = HEADERS.map((header, index) =>
    Math.max(header.length, ...body.map((line) => line[index]!.length)),
  );
  const paint = (line: string[]) => line.map((value, index) => cell(value, widths[index]!)).join("  ").trimEnd();
  const lines = [
    "cat conf / pri conf: how sure that label is. p(decides): probability a person must decide. The flag turns on at 0.50, so a low p is a confident no.",
    paint([...HEADERS]),
    ...body.map(paint),
  ];
  for (const row of rows) {
    if (row.mark === "ok") continue;
    const want = row.expectedNeedsHuman ? "yes" : "no";
    lines.push(`expected ${row.file}: ${row.expectedCategory} / ${row.expectedPriority} / needs person ${want}`);
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  loadDotEnv();
  const config = configFromEnv();
  const fixtures = loadFixtures(decodeURIComponent(new URL("../fixtures", import.meta.url).pathname));
  let categoryHits = 0;
  let priorityHits = 0;
  let humanHits = 0;
  const rows: EvalRow[] = [];
  for (const fixture of fixtures) {
    const result = await classify(fixture.email, config);
    const categoryOk = result.category === fixture.expect.category;
    const priorityOk = result.priority === fixture.expect.priority;
    const humanOk = result.needs_human === fixture.expect.needs_human;
    if (categoryOk) categoryHits += 1;
    if (priorityOk) priorityHits += 1;
    if (humanOk) humanHits += 1;
    rows.push({
      file: fixture.file,
      mark: categoryOk && priorityOk && humanOk ? "ok" : "miss",
      category: result.category,
      categoryConfidence: result.category_confidence,
      priority: result.priority,
      priorityConfidence: result.priority_confidence,
      needsHuman: result.needs_human,
      needsHumanProbability: result.needs_human_probability,
      expectedCategory: fixture.expect.category,
      expectedPriority: fixture.expect.priority,
      expectedNeedsHuman: fixture.expect.needs_human,
    });
  }
  const total = fixtures.length;
  process.stdout.write(`${formatEval(rows)}\n`);
  process.stdout.write(
    `\n${categoryHits}/${total} category, ${priorityHits}/${total} priority, ${humanHits}/${total} needs person\n`,
  );
  if (categoryHits < total || priorityHits < total || humanHits < total) process.exitCode = 1;
}

const isEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
