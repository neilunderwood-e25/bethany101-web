import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant, Outfit } from "next/font/google";
import "./globals.css";

// Body font (sans). Outfit is a variable font, so no explicit weights needed.
// `display: swap` keeps text visible during load; next/font auto-generates a
// size-adjusted fallback to minimise layout shift.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

// Heading font (serif). Cormorant is not a variable font, so weights are
// declared explicitly.
const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Contentful Next.js Starter",
  description: "Next.js + Contentful starter project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
