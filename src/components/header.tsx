import Link from "next/link";
import { SignOutButton } from "./auth-buttons";
import type { Viewer } from "@/lib/viewer";

export function Header({ viewer }: { viewer: Viewer }) {
  return (
    <header className="top">
      <Link href="/" className="wordmark">
        Triage
      </Link>
      {viewer.status === "signed-in" ? (
        <nav>
          <Link href="/inbox">Unread</Link>
          <span className="who">{viewer.email ?? viewer.name}</span>
          <SignOutButton />
        </nav>
      ) : null}
    </header>
  );
}
