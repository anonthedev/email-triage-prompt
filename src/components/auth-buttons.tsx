import { signInWithGoogle, signOutOfGoogle } from "@/actions";

export function SignInButton() {
  return (
    <form action={signInWithGoogle}>
      <button type="submit">Sign in with Google</button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutOfGoogle}>
      <button type="submit" className="quiet">
        Sign out
      </button>
    </form>
  );
}
