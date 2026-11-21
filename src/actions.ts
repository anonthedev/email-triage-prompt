"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/inbox" });
}

export async function signOutOfGoogle(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
