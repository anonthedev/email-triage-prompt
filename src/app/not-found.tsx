import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>That message is not here</h1>
      <p className="note">It may have left the unread inbox, or the sample name is wrong.</p>
      <p>
        <Link href="/">Back to the sample inbox</Link>
      </p>
    </main>
  );
}
