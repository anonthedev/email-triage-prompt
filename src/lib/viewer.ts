import { cache } from "react";
import { auth } from "@/auth";
import { withGmailSlot, type GmailSlot } from "./gmail-session";

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

async function readViewer(): Promise<Viewer> {
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

const loadGmailSession = cache(async (): Promise<{ person: Viewer; slot: GmailSlot }> => {
  const slot: GmailSlot = {};
  const person = await withGmailSlot(slot, readViewer);
  return { person, slot: { accessToken: slot.accessToken, error: slot.error } };
});

export async function viewer(): Promise<Viewer> {
  return (await loadGmailSession()).person;
}

export type GmailGate =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "signed-out" }
  | { ok: false; reason: "message"; message: string };

export function gmailGate(person: Viewer, slot: GmailSlot): GmailGate {
  if (person.status === "signed-out") return { ok: false, reason: "signed-out" };
  if (person.error === "RefreshTokenError" || slot.error === "RefreshTokenError") {
    return { ok: false, reason: "message", message: "Gmail access expired. Sign in again." };
  }
  if (!slot.accessToken) {
    return { ok: false, reason: "message", message: "Gmail access is missing from this session. Sign in again." };
  }
  return { ok: true, accessToken: slot.accessToken };
}

export async function requireGmail(): Promise<GmailGate> {
  const { person, slot } = await loadGmailSession();
  return gmailGate(person, slot);
}
