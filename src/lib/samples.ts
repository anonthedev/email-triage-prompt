import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertEmail } from "./classify";
import type { Email } from "./types";

export type Sample = { id: string; email: Email };

export function fixturesDir(): string {
  return join(process.cwd(), "fixtures");
}

export function loadSamples(dir = fixturesDir()): Sample[] {
  const files = readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  return files.map((file) => {
    const id = file.slice(0, -".json".length);
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as { email?: unknown };
    return { id, email: assertEmail(raw.email) };
  });
}

export function loadSample(id: string, dir = fixturesDir()): Sample | undefined {
  if (!/^[a-z0-9-]+$/.test(id)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(join(dir, `${id}.json`), "utf8")) as { email?: unknown };
    return { id, email: assertEmail(raw.email) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
