import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type StoredGoogleToken = {
  accessToken: string;
  expiresAt?: number;
};

export function googleTokenDir(): string {
  return join(process.cwd(), ".data", "google");
}

function fileFor(userId: string, dir: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return join(dir, `${safe}.json`);
}

export function writeGoogleToken(userId: string, token: StoredGoogleToken, dir = googleTokenDir()): void {
  if (!userId.trim() || !token.accessToken) return;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = fileFor(userId, dir);
  writeFileSync(path, JSON.stringify({ accessToken: token.accessToken, expiresAt: token.expiresAt }), { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function readGoogleToken(userId: string, dir = googleTokenDir()): StoredGoogleToken | undefined {
  if (!userId.trim()) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(fileFor(userId, dir), "utf8")) as StoredGoogleToken;
    if (typeof parsed.accessToken !== "string" || parsed.accessToken === "") return undefined;
    return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    return undefined;
  }
}

export function deleteGoogleToken(userId: string, dir = googleTokenDir()): void {
  if (!userId.trim()) return;
  rmSync(fileFor(userId, dir), { force: true });
}
