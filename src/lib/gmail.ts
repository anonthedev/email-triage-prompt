import type { Email } from "./types";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GmailError";
    this.status = status;
  }
}

type Header = { name?: string; value?: string };

export type MimePart = {
  mimeType?: string;
  headers?: Header[];
  body?: { data?: string };
  parts?: MimePart[];
};

export type GmailMessage = {
  id?: string;
  snippet?: string;
  internalDate?: string;
  payload?: MimePart;
};

export function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function mime(value: string | undefined): string {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function messageText(payload: MimePart | undefined): { plain: string; html: string } {
  const plain: string[] = [];
  const html: string[] = [];
  const walk = (node: MimePart | undefined) => {
    if (!node) return;
    const data = node.body?.data ? decodeBase64Url(node.body.data) : "";
    if (data && mime(node.mimeType) === "text/plain") plain.push(data);
    if (data && mime(node.mimeType) === "text/html") html.push(data);
    for (const child of node.parts ?? []) walk(child);
  };
  walk(payload);
  return { plain: plain.join("\n").trim(), html: html.join("\n").trim() };
}

function header(headers: Header[], name: string): string {
  const found = headers.find((item) => item.name?.toLowerCase() === name);
  return found?.value?.trim() ?? "";
}

function dateFromInternal(internalDate: string | undefined): string {
  if (!internalDate) return "";
  const parsed = new Date(Number(internalDate));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toUTCString();
}

export function emailFromGmail(message: GmailMessage): Email {
  const headers = message.payload?.headers ?? [];
  const from = header(headers, "from") || "Unknown";
  const subject = header(headers, "subject") || "(no subject)";
  const date = header(headers, "date") || dateFromInternal(message.internalDate);
  const text = messageText(message.payload);
  const body = text.plain || (text.html ? htmlToText(text.html) : "") || message.snippet?.trim() || "(This message has no text.)";
  return { from, subject, body, date: date || undefined };
}

async function gmailGet(accessToken: string, url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // The raw slice is the message.
    }
    throw new GmailError(response.status, `Gmail request failed (${response.status}): ${detail}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GmailError(response.status, "Gmail returned a response that is not JSON.");
  }
}

export async function listUnreadIds(accessToken: string, limit = 25): Promise<string[]> {
  const url = new URL(`${GMAIL}/messages`);
  url.searchParams.set("q", "in:inbox is:unread");
  url.searchParams.set("maxResults", String(limit));
  const payload = (await gmailGet(accessToken, url)) as { messages?: { id?: string }[] };
  return (payload.messages ?? []).map((message) => message.id).filter((id): id is string => Boolean(id));
}

export async function readGmailMessage(accessToken: string, id: string): Promise<Email> {
  const url = new URL(`${GMAIL}/messages/${encodeURIComponent(id)}`);
  url.searchParams.set("format", "full");
  return emailFromGmail((await gmailGet(accessToken, url)) as GmailMessage);
}
