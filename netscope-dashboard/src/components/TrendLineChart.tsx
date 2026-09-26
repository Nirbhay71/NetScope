"use client";

import { useMemo, useRef, useState } from "react";

export interface TrendDatum {
  hour: string; // ISO
  requests: number;
  errors: number;
}

const WIDTH = 800;
const HEIGHT = 240;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

export default function TrendLineChart({
  title,
  data,
}: {
  title: string;
  data: TrendDatum[];
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { points, errorPoints, yMax, xForIdx, yFor } = useMemo(() => {
    const yMax = Math.max(...data.map((d) => d.requests), 1);
    const innerW = WIDTH - PAD_L - PAD_R;
    const innerH = HEIGHT - PAD_T - PAD_B;
    const xForIdx = (i: number) =>
      PAD_L + (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW);
    const yFor = (v: number) => PAD_T + innerH - (v / yMax) * innerH;
    const points = data.map((d, i) => [xForIdx(i), yFor(d.requests)] as const);
    const errorPoints = data.map(
      (d, i) => [xForIdx(i), yFor(d.errors)] as const,
    );
    return { points, errorPoints, yMax, xForIdx, yFor };
  }, [data]);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const errorPath = errorPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
    .join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const innerW = WIDTH - PAD_L - PAD_R;
    const rel = (x - PAD_L) / innerW;
    const idx = Math.round(rel * (data.length - 1));
    setHoverIdx(Math.min(Math.max(idx, 0), data.length - 1));
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
        <span className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span className="flex items-center gap-1">
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 2,
                background: "var(--series-1)",
                borderRadius: 2,
              }}
            />
            Requests
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 2,
                background: "var(--series-8)",
                borderRadius: 2,
              }}
            />
            Errors (400+)
          </span>
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={WIDTH - PAD_R}
                y1={y}
                y2={y}
                stroke="var(--gridline)"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--text-muted)"
              >
                {t.toLocaleString()}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD_L}
          x2={WIDTH - PAD_R}
          y1={HEIGHT - PAD_B}
          y2={HEIGHT - PAD_B}
          stroke="var(--baseline)"
          strokeWidth={1}
        />

        <path
          d={errorPath}
          fill="none"
          stroke="var(--series-8)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
        <path
          d={linePath}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.length > 0 && (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r={4}
            fill="var(--series-1)"
            stroke="var(--surface-1)"
            strokeWidth={2}
          />
        )}

        {hoverIdx !== null && (
          <line
            x1={xForIdx(hoverIdx)}
            x2={xForIdx(hoverIdx)}
            y1={PAD_T}
            y2={HEIGHT - PAD_B}
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}
      </svg>
      {hovered && (
        <div
          className="mt-1 rounded px-2 py-1 text-xs"
          style={{
            background: "var(--background)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-hairline)",
            width: "fit-content",
          }}
        >
          {new Date(hovered.hour).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
          })}
          {" — "}
          {hovered.requests.toLocaleString()} requests, {hovered.errors.toLocaleString()} errors
        </div>
      )}
    </div>
  );
}
