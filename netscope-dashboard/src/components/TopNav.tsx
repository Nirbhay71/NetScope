"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/traffic", label: "Traffic" },
  { href: "/security", label: "Security" },
  { href: "/anomalies", label: "Anomalies" },
  { href: "/ask", label: "Ask NetScope" },
];

export interface NavStat {
  label: string;
  value: string;
}

export default function TopNav({ stats }: { stats: NavStat[] }) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-20 flex flex-wrap items-center gap-4 px-6 py-3"
      style={{
        background: "var(--surface-1)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
          style={{ background: "var(--pill-bg)", color: "var(--pill-fg)" }}
        >
          N
        </div>
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          NetScope
        </span>
      </div>

      <nav
        className="flex items-center gap-1 rounded-full p-1"
        style={{ background: "var(--background)" }}
      >
        {LINKS.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-sm transition-colors"
              style={{
                background: active ? "var(--pill-bg)" : "transparent",
                color: active ? "var(--pill-fg)" : "var(--text-secondary)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-5">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-sm">
            <span style={{ color: "var(--text-secondary)" }}>{s.label}</span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {s.value}
            </span>
          </div>
        ))}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: "var(--accent)", color: "white" }}
        >
          N
        </div>
      </div>
    </header>
  );
}
