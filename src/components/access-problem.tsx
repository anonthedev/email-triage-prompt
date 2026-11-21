import { SignInButton } from "./auth-buttons";
import { googleOAuthConfigured } from "@/lib/viewer";

export function AccessProblem({ title, message }: { title: string; message: string }) {
  return (
    <main>
      <h1>{title}</h1>
      <p className="note">{message}</p>
      {googleOAuthConfigured() ? <SignInButton /> : null}
    </main>
  );
}
