import Link from "next/link";
import { confidenceText, formatWhen, isWeak, senderName } from "@/lib/present";
import type { TriagedMail } from "@/lib/triage";

function Sure({ value }: { value: number }) {
  const weak = isWeak(value);
  return (
    <span className={weak ? "conf weak" : "conf"}>
      {confidenceText(value)}
      {weak ? <span className="weak-word"> weak</span> : null}
    </span>
  );
}

function Row({ row }: { row: TriagedMail }) {
  const priority = row.classification?.priority ?? "none";
  return (
    <Link className="row" href={row.href}>
      <span className={`bar ${priority}`} aria-hidden="true" />
      <span className="letter">
        <span className="from">{senderName(row.email.from)}</span>
        <span className="subject">{row.email.subject}</span>
        {row.email.date ? <span className="when">{formatWhen(row.email.date)}</span> : null}
      </span>
      {row.classification ? (
        <span className="labels">
          <span className="pair">
            <span className="field">Category</span>
            <span className="cat">{row.classification.category}</span>
            <Sure value={row.classification.category_confidence} />
          </span>
          <span className="pair">
            <span className="field">Priority</span>
            <span className={`pri ${row.classification.priority}`}>{row.classification.priority}</span>
            <Sure value={row.classification.priority_confidence} />
          </span>
          <span className={row.classification.needs_human ? "human" : "human off"}>
            {row.classification.needs_human ? "Needs a person" : "Staff can answer"}
          </span>
        </span>
      ) : (
        <span className="row-error">{row.error ?? "Could not classify this message."}</span>
      )}
    </Link>
  );
}

export function MailList({ rows }: { rows: TriagedMail[] }) {
  return (
    <div className="list">
      {rows.map((row) => (
        <Row key={row.id} row={row} />
      ))}
    </div>
  );
}
