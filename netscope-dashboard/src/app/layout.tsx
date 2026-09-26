import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TopNav from "@/components/TopNav";
import { getKpis } from "@/lib/snowflake/queries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NetScope",
  description: "Global IP traffic intelligence, powered by Snowflake",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const kpis = await getKpis();

  const stats = [
    { label: "Requests", value: kpis.TOTAL_REQUESTS.toLocaleString() },
    { label: "Countries", value: String(kpis.COUNTRIES) },
    { label: "Error rate", value: `${kpis.ERROR_RATE_PERCENT}%` },
    { label: "Avg latency", value: `${kpis.AVG_LATENCY_MS}ms` },
  ];

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ background: "var(--background)" }}
      >
        <TopNav stats={stats} />
        <main className="min-h-screen flex-1 overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
