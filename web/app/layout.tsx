import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aegis Logistics — Predictable by design",
  description:
    "Real-data logistics demos: cost, delivery time, risk, support triage, and hub volume forecasts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
