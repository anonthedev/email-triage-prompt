import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Outfit } from "next/font/google";
import { Header } from "@/components/header";
import { viewer } from "@/lib/viewer";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Triage",
  description: "Sort faculty and office mail by what needs a person.",
  icons: { icon: "/logo.png" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const person = await viewer();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <div className="shell">
          <Header viewer={person} />
          {children}
          <footer className="colophon">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
