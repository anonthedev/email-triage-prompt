import Link from "next/link";
import { SignInButton } from "@/components/auth-buttons";
import { MailBoard } from "@/components/mail-board";
import { readConfig } from "@/lib/env";
import { loadSamples } from "@/lib/samples";
import { triageSamples } from "@/lib/triage";
import { googleOAuthConfigured, viewer } from "@/lib/viewer";

export default async function HomePage() {
  const person = await viewer();
  const configured = readConfig();
  const samples = configured.ok ? await triageSamples(loadSamples(), configured.config) : [];
  return (
    <main>
      <p className="lede">Faculty and office mail, with the messages that need a person put first.</p>
      <div className="actions">
        {person.status === "signed-in" ? (
          <Link className="action" href="/inbox">
            Open unread inbox
          </Link>
        ) : googleOAuthConfigured() ? (
          <SignInButton />
        ) : (
          <p className="note">
            Google sign-in needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET. The redirect URI is
            http://localhost:3000/api/auth/callback/google.
          </p>
        )}
      </div>
      <h1>Sample</h1>
      <p className="note">
        These ten are the fixture set{configured.ok ? `, read by ${configured.config.model}` : ""}. A live inbox is the unread
        mail in Gmail, capped at 25.
      </p>
      {configured.ok ? <MailBoard rows={samples} /> : <p className="row-error">{configured.error}</p>}
    </main>
  );
}
