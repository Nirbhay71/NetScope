import AskNetScope from "@/components/AskNetScope";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="px-6 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Ask NetScope
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Ask questions in plain English — answered by Snowflake Cortex,
            grounded in your live traffic data.
          </p>
        </header>

        <AskNetScope initialQuestion={q} />
      </div>
    </div>
  );
}
