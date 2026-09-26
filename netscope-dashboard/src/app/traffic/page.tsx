import HorizontalBarChart from "@/components/HorizontalBarChart";
import WorldTrafficMap from "@/components/WorldTrafficMap";
import {
  getCountryTraffic,
  getAsnTraffic,
  getEndpointTraffic,
} from "@/lib/snowflake/queries";

export const dynamic = "force-dynamic";

export default async function TrafficExplorerPage() {
  const [countries, asns, endpoints] = await Promise.all([
    getCountryTraffic(15),
    getAsnTraffic(10),
    getEndpointTraffic(12),
  ]);

  return (
    <div className="px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Traffic explorer
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Where requests come from, and what they hit
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WorldTrafficMap
            data={countries.map((c) => ({
              countryCode: c.COUNTRY_CODE,
              countryName: c.COUNTRY_NAME,
              requests: c.TOTAL_REQUESTS,
            }))}
          />
          <HorizontalBarChart
            title="Top countries by requests"
            data={countries.map((c) => ({
              label: c.COUNTRY_NAME,
              value: c.TOTAL_REQUESTS,
              secondaryLabel: `${c.UNIQUE_IPS} IPs`,
            }))}
          />
        </section>

        <HorizontalBarChart
          title="Top ASNs by requests"
          data={asns.map((a) => ({
            label: a.ASN_NAME,
            value: a.TOTAL_REQUESTS,
            secondaryLabel: a.ASN,
          }))}
        />

        <HorizontalBarChart
          title="Top endpoints by requests"
          data={endpoints.map((e) => ({
            label: e.ENDPOINT,
            value: e.TOTAL_REQUESTS,
            secondaryLabel: `${e.ERROR_COUNT} errors`,
          }))}
        />
      </div>
    </div>
  );
}
