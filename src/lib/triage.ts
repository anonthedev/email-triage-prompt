import { classificationKey, readClassification, writeClassification } from "./cache";
import { classify } from "./classify";
import { listUnreadIds, readGmailMessage } from "./gmail";
import { AT_ONCE, mapPool } from "./pool";
import { compareTriage } from "./sort";
import type { Classification, Config, Email } from "./types";

export type TriagedMail = {
  id: string;
  href: string;
  email: Email;
  classification?: Classification;
  error?: string;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function classifyCached(
  id: string,
  email: Email,
  config: Config,
  fetchImpl: typeof fetch = fetch,
  cacheRoot?: string,
): Promise<Classification> {
  const key = classificationKey(id, email, config.model);
  const cached = readClassification(key, cacheRoot);
  if (cached) return cached;
  const result = await classify(email, config, fetchImpl);
  try {
    writeClassification(key, result, cacheRoot);
  } catch {
    // A full disk should not hide a classification that already succeeded.
  }
  return result;
}

export async function classifyMail(
  id: string,
  email: Email,
  config: Config,
  href: string,
  fetchImpl?: typeof fetch,
  cacheRoot?: string,
): Promise<TriagedMail> {
  try {
    const classification = await classifyCached(id, email, config, fetchImpl, cacheRoot);
    return { id, href, email, classification };
  } catch (error) {
    return { id, href, email, error: messageOf(error) };
  }
}

export async function triageSamples(
  samples: { id: string; email: Email }[],
  config: Config,
): Promise<TriagedMail[]> {
  const rows = await mapPool(samples, AT_ONCE, (sample) =>
    classifyMail(sample.id, sample.email, config, `/sample/${sample.id}`),
  );
  rows.sort(compareTriage);
  return rows;
}

export async function triageUnread(accessToken: string, config: Config): Promise<TriagedMail[]> {
  const ids = await listUnreadIds(accessToken);
  const rows = await mapPool(ids, AT_ONCE, async (id) => {
    const href = `/inbox/${encodeURIComponent(id)}`;
    try {
      const email = await readGmailMessage(accessToken, id);
      return classifyMail(id, email, config, href);
    } catch (error) {
      return {
        id,
        href,
        email: {
          from: "Unknown",
          subject: "(Could not read this message)",
          body: "(Could not read this message)",
        },
        error: messageOf(error),
      };
    }
  });
  rows.sort(compareTriage);
  return rows;
}
