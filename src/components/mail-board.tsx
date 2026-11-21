"use client";

import { useMemo, useState } from "react";
import { MailList } from "./mail-list";
import { applyMailView, DEFAULT_VIEW, type MailView, type SortKey } from "@/lib/filter";
import { CATEGORIES, PRIORITIES } from "@/lib/types";
import type { TriagedMail } from "@/lib/triage";

export function MailBoard({ rows }: { rows: TriagedMail[] }) {
  const [view, setView] = useState<MailView>(DEFAULT_VIEW);
  const shown = useMemo(() => applyMailView(rows, view), [rows, view]);
  const set = <K extends keyof MailView>(key: K, value: MailView[K]) => setView((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <div className="controls">
        <label>
          Category
          <select value={view.category} onChange={(event) => set("category", event.target.value as MailView["category"])}>
            <option value="">Any</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={view.priority} onChange={(event) => set("priority", event.target.value as MailView["priority"])}>
            <option value="">Any</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label>
          Decision
          <select value={view.decision} onChange={(event) => set("decision", event.target.value as MailView["decision"])}>
            <option value="">Any</option>
            <option value="person">Needs a person</option>
            <option value="staff">Staff can answer</option>
          </select>
        </label>
        <label>
          Sort
          <select value={view.sort} onChange={(event) => set("sort", event.target.value as SortKey)}>
            <option value="priority">Priority</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="kind">Category</option>
            <option value="least-sure">Least sure</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={view.weakOnly} onChange={(event) => set("weakOnly", event.target.checked)} />
          Weak calls only
        </label>
      </div>
      <p className="count">
        {shown.length} of {rows.length}
      </p>
      {shown.length === 0 ? <p className="note">Nothing matches these filters.</p> : <MailList rows={shown} />}
    </div>
  );
}
