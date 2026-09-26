function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function StatTile({
  label,
  value,
  suffix,
  compact = true,
}: {
  label: string;
  value: number;
  suffix?: string;
  compact?: boolean;
}) {
  const display = compact ? formatCompact(value) : value.toLocaleString();
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <div
        className="mt-1 text-3xl font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {display}
        {suffix ? (
          <span
            className="ml-1 text-lg font-normal"
            style={{ color: "var(--text-secondary)" }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
