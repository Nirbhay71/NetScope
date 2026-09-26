"use client";

import { useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";

export interface CountryMapDatum {
  countryCode: string;
  countryName: string;
  requests: number;
}

// ISO 3166-1 alpha-2 -> numeric (as plain integers, no leading zeros —
// normalized to match topojson feature ids at lookup time)
const ALPHA2_TO_NUMERIC: Record<string, number> = {
  US: 840,
  CA: 124,
  GB: 826,
  DE: 276,
  FR: 250,
  IN: 356,
  JP: 392,
  AU: 36,
  RU: 643,
  CN: 156,
  BR: 76,
  VN: 704,
  IR: 364,
};

export default function WorldTrafficMap({
  data,
}: {
  data: CountryMapDatum[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<CountryMapDatum | null>(null);
  const [hoveredNumericId, setHoveredNumericId] = useState<number | null>(null);
  const [selected, setSelected] = useState<CountryMapDatum | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const byNumericId = useMemo(() => {
    const map = new Map<number, CountryMapDatum>();
    for (const d of data) {
      const numeric = ALPHA2_TO_NUMERIC[d.countryCode];
      if (numeric !== undefined) map.set(numeric, d);
    }
    return map;
  }, [data]);

  const max = Math.max(...data.map((d) => d.requests), 1);
  const colorScale = scaleLinear<string>()
    .domain([0, max])
    .range(["#cde2fb", "#256abf"]); // sequential blue ramp, step 100 -> 500

  function handlePointerMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const active = selected ?? hovered;

  return (
    <div
      className="relative rounded-lg p-4"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Traffic by country
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            className="flex h-6 w-6 items-center justify-center rounded text-xs"
            style={{ background: "var(--background)", color: "var(--text-secondary)" }}
          >
            −
          </button>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(6, z + 0.5))}
            className="flex h-6 w-6 items-center justify-center rounded text-xs"
            style={{ background: "var(--background)", color: "var(--text-secondary)" }}
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setSelected(null);
            }}
            className="rounded px-2 py-0.5 text-xs"
            style={{ background: "var(--background)", color: "var(--text-secondary)" }}
          >
            Reset
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHovered(null)}
        className="relative"
      >
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          style={{ width: "100%", height: "auto", cursor: "grab" }}
        >
          <ZoomableGroup
            zoom={zoom}
            onMoveStart={() => setHovered(null)}
            minZoom={1}
            maxZoom={6}
          >
            <Geographies geography="/countries-110m.json">
              {({ geographies }) =>
                geographies.map((geo) => {
                  const numericId = Number(geo.id);
                  const match = byNumericId.get(numericId);
                  const isSelected = selected && match === selected;
                  const isHovered = hoveredNumericId === numericId;
                  const baseFill = match ? colorScale(match.requests) : "var(--gridline)";
                  const fill = isHovered && match ? "var(--series-2)" : baseFill;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => {
                        setHovered(match ?? null);
                        setHoveredNumericId(numericId);
                      }}
                      onMouseLeave={() => {
                        setHovered(null);
                        setHoveredNumericId(null);
                      }}
                      onMouseMove={handlePointerMove}
                      onClick={() => match && setSelected(match)}
                      fill={fill}
                      stroke={isSelected ? "var(--text-primary)" : "var(--surface-1)"}
                      strokeWidth={isSelected ? 1.25 : 0.5}
                      style={{
                        outline: "none",
                        cursor: match ? "pointer" : "default",
                        transition: "fill 120ms ease",
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {active && cursor && (
          <div
            className="pointer-events-none absolute z-10 rounded px-2 py-1 text-xs shadow whitespace-nowrap"
            style={{
              left: Math.min(cursor.x + 12, (containerRef.current?.clientWidth ?? 300) - 140),
              top: Math.max(cursor.y - 32, 0),
              background: "var(--text-primary)",
              color: "var(--surface-1)",
            }}
          >
            {active.countryName}: {active.requests.toLocaleString()} requests
          </div>
        )}
      </div>

      {selected && (
        <div
          className="mt-2 flex items-center justify-between rounded px-3 py-2 text-xs"
          style={{ background: "var(--background)", color: "var(--text-secondary)" }}
        >
          <span>
            Pinned: <strong style={{ color: "var(--text-primary)" }}>{selected.countryName}</strong>{" "}
            — {selected.requests.toLocaleString()} requests
          </span>
          <button onClick={() => setSelected(null)} style={{ color: "var(--series-1)" }}>
            Clear
          </button>
        </div>
      )}

      <div
        className="mt-2 flex items-center gap-2 text-xs"
        style={{ color: "var(--text-secondary)" }}
      >
        <span>Fewer requests</span>
        <span
          style={{
            display: "inline-block",
            width: 80,
            height: 8,
            borderRadius: 4,
            background: "linear-gradient(to right, #cde2fb, #256abf)",
          }}
        />
        <span>More requests</span>
        <span className="ml-auto" style={{ color: "var(--text-muted)" }}>
          Scroll or +/− to zoom, drag to pan, click a country to pin it
        </span>
      </div>
    </div>
  );
}
