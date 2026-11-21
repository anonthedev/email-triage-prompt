import { auth } from "@/auth";
import { readGoogleToken } from "./google-tokens";

export type Viewer =
  | { status: "signed-out" }
  | {
      status: "signed-in";
      name?: string | null;
      email?: string | null;
      userId: string;
      error?: "RefreshTokenError";
    };

export function googleOAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim() && env.AUTH_SECRET?.trim());
}

export async function viewer(): Promise<Viewer> {
  if (!process.env.AUTH_SECRET?.trim()) return { status: "signed-out" };
  try {
    const session = await auth();
    if (!session?.user) return { status: "signed-out" };
    return {
      status: "signed-in",
      name: session.user.name,
      email: session.user.email,
      userId: session.user.id ?? "",
      error: session.error,
    };
  } catch {
    return { status: "signed-out" };
  }
}

export type GmailGate =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "signed-out" }
  | { ok: false; reason: "message"; message: string };

export async function requireGmail(): Promise<GmailGate> {
  const person = await viewer();
  if (person.status === "signed-out") return { ok: false, reason: "signed-out" };
  if (person.error === "RefreshTokenError") {
    return { ok: false, reason: "message", message: "Gmail access expired. Sign in again." };
  }
  const accessToken = person.userId ? readGoogleToken(person.userId)?.accessToken : undefined;
  if (!accessToken) {
    return { ok: false, reason: "message", message: "The Gmail access token is not on disk. Sign in again." };
  }
  return { ok: true, accessToken };
}
