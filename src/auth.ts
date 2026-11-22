import NextAuth from "next-auth";
import type { JWT } from "@auth/core/jwt";
import Google from "next-auth/providers/google";
import { noteGmailToken } from "./lib/gmail-session";

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenError";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: "RefreshTokenError";
  }
}

const GMAIL_SCOPE = "openid email profile https://www.googleapis.com/auth/gmail.readonly";

function googleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return Google({
    clientId,
    clientSecret,
    authorization: {
      params: {
        prompt: "consent",
        access_type: "offline",
        response_type: "code",
        scope: GMAIL_SCOPE,
      },
    },
  });
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : "";
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!refreshToken || !clientId || !clientSecret) return { ...token, error: "RefreshTokenError" };
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const refreshed = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };
    if (!response.ok || !refreshed.access_token) return { ...token, error: "RefreshTokenError" };
    const next: JWT = {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
      refreshToken: refreshed.refresh_token ?? refreshToken,
    };
    delete next.error;
    return next;
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

const google = googleProvider();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: google ? [google] : [],
  pages: { signIn: "/", error: "/auth/error" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        if (account.refresh_token) token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
        delete token.error;
      } else if (typeof token.expiresAt === "number" && Date.now() / 1000 > token.expiresAt - 60) {
        token = await refreshAccessToken(token);
      }
      noteGmailToken(token);
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      if (token.error === "RefreshTokenError") session.error = "RefreshTokenError";
      return session;
    },
  },
});
