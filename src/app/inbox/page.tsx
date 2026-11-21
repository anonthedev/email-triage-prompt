import { redirect } from "next/navigation";
import { AccessProblem } from "@/components/access-problem";
import { MailBoard } from "@/components/mail-board";
import { readConfig } from "@/lib/env";
import { triageUnread } from "@/lib/triage";
import { requireGmail } from "@/lib/viewer";

export default async function InboxPage() {
  const gate = await requireGmail();
  if (!gate.ok) {
    if (gate.reason === "signed-out") redirect("/");
    return <AccessProblem title="Unread" message={gate.message} />;
  }
  const configured = readConfig();
  if (!configured.ok) return <AccessProblem title="Unread" message={configured.error} />;
  let rows;
  try {
    rows = await triageUnread(gate.accessToken, configured.config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return <AccessProblem title="Unread" message={message} />;
  }
  return (
    <main>
      <h1>Unread</h1>
      <p className="note">Unread mail in your inbox, capped at 25, read by {configured.config.model}. This does not send anything.</p>
      {rows.length === 0 ? <p className="note">Nothing unread in the inbox.</p> : <MailBoard rows={rows} />}
    </main>
  );
}
