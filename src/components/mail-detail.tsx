import Link from "next/link";
import { NEEDS_HUMAN_AT } from "@/lib/rubric";
import { confidenceText, formatWhen, isWeak } from "@/lib/present";
import type { TriagedMail } from "@/lib/triage";

function bars(probabilities: Record<string, number>, chosen: string, chosenConfidence: number) {
  const rows = Object.entries(probabilities)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0)
    .map(([label, value]) => ({ label, value }));
  if (!rows.some((row) => row.label === chosen)) rows.push({ label: chosen, value: chosenConfidence });
  rows.sort((a, b) => b.value - a.value);
  return rows;
}

function Meter({ label, value, chosen }: { label: string; value: number; chosen: boolean }) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <li className={chosen ? "chosen" : undefined}>
      <span>{label}</span>
      <span className="track" aria-hidden="true">
        <span className="fill" style={{ width }} />
      </span>
      <span className={isWeak(value) && chosen ? "conf weak" : "conf"}>{confidenceText(value)}</span>
    </li>
  );
}

export function MailDetail({ mail, backHref, backLabel }: { mail: TriagedMail; backHref: string; backLabel: string }) {
  const classification = mail.classification;
  return (
    <main className="detail">
      <p className="back">
        <Link href={backHref}>{backLabel}</Link>
      </p>
      <p className="from">{mail.email.from}</p>
      <h1>{mail.email.subject}</h1>
      {mail.email.date ? <p className="when">{formatWhen(mail.email.date)}</p> : null}
      {classification ? (
        <section className="reading">
          <h2 className="kicker">Category</h2>
          <ul className="probs">
            {bars(classification.category_probabilities, classification.category, classification.category_confidence).map((row) => (
              <Meter key={row.label} label={row.label} value={row.value} chosen={row.label === classification.category} />
            ))}
          </ul>
          {isWeak(classification.category_confidence) ? <p className="weak-note">Weak category call.</p> : null}
          <h2 className="kicker">Priority</h2>
          <ul className="probs">
            {bars(classification.priority_probabilities, classification.priority, classification.priority_confidence).map((row) => (
              <Meter key={row.label} label={row.label} value={row.value} chosen={row.label === classification.priority} />
            ))}
          </ul>
          {isWeak(classification.priority_confidence) ? <p className="weak-note">Weak priority call.</p> : null}
          <h2 className="kicker">Decision</h2>
          <p className="decision">{classification.needs_human ? "Needs a person" : "Staff can answer"}</p>
          <p className="note">
            {classification.needs_human
              ? "A person has to decide this."
              : "Staff can answer this without making a decision."}{" "}
            That call turns on at {NEEDS_HUMAN_AT.toFixed(2)}. {confidenceText(classification.needs_human_probability)} is the
            probability a person must decide, so a low number is a confident no.
          </p>
          {classification.truncated ? <p className="note">Only the opening of this message was read.</p> : null}
          <p className="model">Read by {classification.model}</p>
        </section>
      ) : (
        <p className="row-error">{mail.error ?? "Could not classify this message."}</p>
      )}
      <article className="body">{mail.email.body}</article>
    </main>
  );
}
