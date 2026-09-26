import Link from "next/link";
import type { AnomalyRow } from "@/lib/snowflake/queries";

function investigateHref(a: AnomalyRow): string {
  const q = `Why was the traffic spike in ${a.COUNTRY_NAME ?? a.COUNTRY_CODE} around ${a.HOUR} flagged (${a.REQUEST_COUNT} requests vs a baseline of ${a.BASELINE_AVG})? What's the likely explanation and what should I investigate next?`;
  return `/ask?q=${encodeURIComponent(q)}`;
}

export default function AnomalyList({ anomalies }: { anomalies: AnomalyRow[] }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface-1)", boxShadow: "var(--card-shadow)" }}
    >
      {anomalies.length === 0 ? (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No anomalies detected in the current window.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {anomalies.map((a, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
              style={{ background: "var(--background)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 9999,
                    background: "var(--status-critical)",
                  }}
                />
                <span style={{ color: "var(--text-primary)" }}>
                  {a.COUNTRY_NAME ?? a.COUNTRY_CODE}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {new Date(a.HOUR).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right" style={{ color: "var(--text-secondary)" }}>
                  {a.REQUEST_COUNT.toLocaleString()} reqs
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    (baseline {a.BASELINE_AVG?.toLocaleString()})
                  </span>
                </div>
                <Link
                  href={investigateHref(a)}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  Investigate
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
