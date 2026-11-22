import { AsyncLocalStorage } from "node:async_hooks";

export type GmailSlot = {
  accessToken?: string;
  error?: "RefreshTokenError";
};

const slots = new AsyncLocalStorage<GmailSlot>();

export async function withGmailSlot<T>(slot: GmailSlot, run: () => Promise<T>): Promise<T> {
  return slots.run(slot, run);
}

/** Record the token for the request that is decoding the session. No-op outside that request. */
export function noteGmailToken(token: { accessToken?: unknown; error?: unknown }): void {
  const slot = slots.getStore();
  if (!slot) return;
  slot.accessToken = typeof token.accessToken === "string" && token.accessToken ? token.accessToken : undefined;
  slot.error = token.error === "RefreshTokenError" ? "RefreshTokenError" : undefined;
}
