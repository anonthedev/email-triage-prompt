import { readFileSync } from "node:fs";
import type { Config } from "./types";

type Env = Record<string, string | undefined>;

/** Load KEY=value lines from a dotenv file. Existing process env wins. */
export function loadDotEnv(path = ".env", env: Env = process.env): void {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = value;
  }
}

export function configFromEnv(env: Env = process.env): Config {
  const apiKey = env.TYPESAFE_API_KEY?.trim() ?? "";
  const baseUrl = (env.TYPESAFE_BASE_URL?.trim() || "https://api.typesafe.ai").replace(/\/$/, "");
  const model = env.TYPESAFE_MODEL?.trim() || "jev-latest";
  if (!apiKey) throw new Error("Set TYPESAFE_API_KEY. The classifier does not ship with a key.");
  return { apiKey, baseUrl, model };
}

export function readConfig(env: Env = process.env): { ok: true; config: Config } | { ok: false; error: string } {
  try {
    return { ok: true, config: configFromEnv(env) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
