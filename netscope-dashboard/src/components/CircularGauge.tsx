export default function CircularGauge({
  label,
  value,
  size = 96,
}: {
  label: string;
  value: number; // 0-100
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl p-4"
      style={{
        background: "var(--surface-1)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--gridline)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {pct.toFixed(0)}%
        </div>
      </div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
    </div>
  );
}
