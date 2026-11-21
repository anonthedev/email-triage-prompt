import { notFound, redirect } from "next/navigation";
import { AccessProblem } from "@/components/access-problem";
import { MailDetail } from "@/components/mail-detail";
import { readConfig } from "@/lib/env";
import { GmailError, readGmailMessage } from "@/lib/gmail";
import { classifyMail } from "@/lib/triage";
import { requireGmail } from "@/lib/viewer";

export default async function InboxMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requireGmail();
  if (!gate.ok) {
    if (gate.reason === "signed-out") redirect("/");
    return <AccessProblem title="Unread" message={gate.message} />;
  }
  const configured = readConfig();
  if (!configured.ok) return <AccessProblem title="Unread" message={configured.error} />;
  const { id } = await params;
  const messageId = decodeURIComponent(id);
  try {
    const email = await readGmailMessage(gate.accessToken, messageId);
    const mail = await classifyMail(messageId, email, configured.config, `/inbox/${encodeURIComponent(messageId)}`);
    return <MailDetail mail={mail} backHref="/inbox" backLabel="Unread" />;
  } catch (error) {
    if (error instanceof GmailError && error.status === 404) notFound();
    const message = error instanceof Error ? error.message : String(error);
    return <AccessProblem title="Unread" message={message} />;
  }
}
