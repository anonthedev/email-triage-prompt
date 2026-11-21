import Link from "next/link";

function explain(error?: string): string {
  if (error === "Configuration") return "Google OAuth is missing a client id, secret, or AUTH_SECRET.";
  if (error === "AccessDenied") return "Google denied access to this account.";
  if (error === "OAuthCallback" || error === "OAuthSignin") {
    return "Google could not finish sign-in. Check that the redirect URI is http://localhost:3000/api/auth/callback/google.";
  }
  return "Sign-in did not finish. Check the Google client and AUTH_SECRET, then try again.";
}

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main>
      <h1>Google sign-in failed</h1>
      <p className="note">{explain(error)}</p>
      <p>
        <Link href="/">Back to the sample inbox</Link>
      </p>
    </main>
  );
}
