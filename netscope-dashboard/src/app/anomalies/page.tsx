import AnomalyList from "@/components/AnomalyList";
import { getAnomalies } from "@/lib/snowflake/queries";

export const dynamic = "force-dynamic";

export default async function AnomaliesPage() {
  const anomalies = await getAnomalies();

  return (
    <div className="px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Anomalies
          </h1>
        </header>

        <AnomalyList anomalies={anomalies} />
      </div>
    </div>
  );
}
