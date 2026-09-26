import HorizontalBarChart from "@/components/HorizontalBarChart";
import DataTable from "@/components/DataTable";
import { getSuspiciousIps, getAsnThreatClusters } from "@/lib/snowflake/queries";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const [ips, asns] = await Promise.all([
    getSuspiciousIps(15),
    getAsnThreatClusters(10),
  ]);

  return (
    <div className="px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Security
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Bot &amp; click-fraud signals and ASN-level threat clustering,
            derived from behavioral rules on the synthetic dataset — not a
            production detection system.
          </p>
        </header>

        <HorizontalBarChart
          title="ASNs contributing the most flagged traffic"
          data={asns.map((a) => ({
            label: a.ASN_NAME,
            value: a.PERCENT_OF_ALL_FLAGGED,
            secondaryLabel: `${a.ASN} · ${a.FLAGGED_SHARE_PERCENT}% of its own traffic flagged`,
          }))}
          unit="%"
        />

        <DataTable
          title="Most suspicious IPs (by bot ratio)"
          rows={ips}
          emptyMessage="No suspicious IPs found."
          columns={[
            { key: "ip", header: "IP address", render: (r) => r.IP_ADDRESS },
            { key: "country", header: "Country", render: (r) => r.COUNTRY_NAME },
            { key: "asn", header: "ASN", render: (r) => r.ASN_NAME },
            {
              key: "requests",
              header: "Requests",
              align: "right",
              render: (r) => r.TOTAL_REQUESTS.toLocaleString(),
            },
            {
              key: "bot_ratio",
              header: "Bot ratio",
              align: "right",
              render: (r) => (
                <span
                  style={{
                    color:
                      r.BOT_RATIO_PERCENT >= 50
                        ? "var(--status-critical)"
                        : "var(--text-primary)",
                    fontWeight: r.BOT_RATIO_PERCENT >= 50 ? 600 : 400,
                  }}
                >
                  {r.BOT_RATIO_PERCENT}%
                </span>
              ),
            },
            {
              key: "endpoints",
              header: "Endpoints hit",
              align: "right",
              render: (r) => r.DISTINCT_ENDPOINTS,
            },
            {
              key: "errors",
              header: "Errors",
              align: "right",
              render: (r) => r.ERROR_COUNT,
            },
          ]}
        />
      </div>
    </div>
  );
}
