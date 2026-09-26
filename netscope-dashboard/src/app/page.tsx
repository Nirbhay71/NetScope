import Link from "next/link";
import StatTile from "@/components/StatTile";
import TrendLineChart from "@/components/TrendLineChart";
import { getKpis, getHourlyTrend, getAnomalies } from "@/lib/snowflake/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [kpis, hourly, anomalies] = await Promise.all([
    getKpis(),
    getHourlyTrend(),
    getAnomalies(),
  ]);

  return (
    <div className="px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Overview
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Synthetic traffic dataset — last 7 days
          </p>
        </header>

        {anomalies.length > 0 && (
          <Link
            href="/anomalies"
            className="flex items-center justify-between rounded-lg px-4 py-3 text-sm"
            style={{
              background: "var(--surface-1)",
              border: `1px solid var(--status-critical)`,
              color: "var(--text-primary)",
            }}
          >
            <span className="flex items-center gap-2">
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
              {anomalies.length} traffic anomal{anomalies.length === 1 ? "y" : "ies"} detected
              in the last 7 days
            </span>
            <span style={{ color: "var(--series-1)" }}>View details →</span>
          </Link>
        )}

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Total requests" value={kpis.TOTAL_REQUESTS} />
          <StatTile label="Unique IPs" value={kpis.UNIQUE_IPS} />
          <StatTile label="Countries" value={kpis.COUNTRIES} compact={false} />
          <StatTile
            label="Error rate"
            value={kpis.ERROR_RATE_PERCENT}
            suffix="%"
            compact={false}
          />
          <StatTile
            label="Avg latency"
            value={kpis.AVG_LATENCY_MS}
            suffix="ms"
            compact={false}
          />
          <StatTile
            label="P95 latency"
            value={kpis.P95_LATENCY_MS}
            suffix="ms"
            compact={false}
          />
          <StatTile
            label="Bot traffic"
            value={kpis.BOT_TRAFFIC_PERCENT}
            suffix="%"
            compact={false}
          />
          <StatTile label="Total bytes sent" value={kpis.TOTAL_BYTES} />
        </section>

        <TrendLineChart
          title="Hourly traffic trend"
          data={hourly.map((h) => ({
            hour: h.HOUR,
            requests: h.TOTAL_REQUESTS,
            errors: h.ERROR_COUNT,
          }))}
        />
      </div>
    </div>
  );
}
