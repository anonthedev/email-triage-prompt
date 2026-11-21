import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Classification, Email } from "./types";

export function defaultCacheRoot(): string {
  return join(process.cwd(), ".data", "classifications");
}

export function classificationKey(id: string, email: Email, model: string): string {
  const digest = createHash("sha256")
    .update(model)
    .update("\0")
    .update(email.from)
    .update("\0")
    .update(email.subject)
    .update("\0")
    .update(email.body)
    .update("\0")
    .update(email.date ?? "")
    .digest("hex")
    .slice(0, 20);
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `${safeId}-${digest}`;
}

export function readClassification(key: string, root = defaultCacheRoot()): Classification | undefined {
  try {
    return JSON.parse(readFileSync(join(root, `${key}.json`), "utf8")) as Classification;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    return undefined;
  }
}

export function writeClassification(key: string, value: Classification, root = defaultCacheRoot()): void {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const path = join(root, `${key}.json`);
  writeFileSync(path, JSON.stringify(value), { mode: 0o600 });
  chmodSync(path, 0o600);
}
