"use client";

export interface BarDatum {
  label: string;
  value: number;
  secondaryLabel?: string;
}

export default function HorizontalBarChart({
  title,
  data,
  unit = "",
}: {
  title: string;
  data: BarDatum[];
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barHeight = 20;
  const gap = 12;

  function formatValue(v: number) {
    return unit ? `${v.toLocaleString()}${unit}` : v.toLocaleString();
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface-1)", boxShadow: "var(--card-shadow)" }}
    >
      <div
        className="mb-3 text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </div>
      <div className="flex flex-col" style={{ gap }}>
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          const barPct = Math.max(pct, 1.5);
          // once the bar is long enough, put the label inside it (right-aligned,
          // white text) instead of after it — otherwise it overflows the card
          const labelInside = barPct > 82;
          return (
            <div key={d.label}>
              <div
                className="mb-1 flex justify-between text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                <span className="truncate pr-2">{d.label}</span>
                {d.secondaryLabel ? (
                  <span className="shrink-0">{d.secondaryLabel}</span>
                ) : null}
              </div>
              <div
                className="relative w-full rounded-full"
                style={{ height: barHeight, background: "var(--gridline)" }}
              >
                <div
                  className="absolute left-0 top-0 flex items-center justify-end rounded-full px-2"
                  style={{
                    width: `${barPct}%`,
                    height: barHeight,
                    background: "var(--accent)",
                  }}
                >
                  {labelInside && (
                    <span
                      className="text-xs font-medium whitespace-nowrap"
                      style={{ color: "white" }}
                    >
                      {formatValue(d.value)}
                    </span>
                  )}
                </div>
                {!labelInside && (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-xs font-medium whitespace-nowrap"
                    style={{
                      left: `calc(${barPct}% + 8px)`,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatValue(d.value)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
