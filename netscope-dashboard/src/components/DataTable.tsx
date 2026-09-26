import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

export default function DataTable<T>({
  title,
  columns,
  rows,
  emptyMessage = "No rows.",
}: {
  title: string;
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
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
      {rows.length === 0 ? (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border-b px-2 py-2 text-xs font-medium uppercase tracking-wide"
                    style={{
                      borderColor: "var(--border-hairline)",
                      color: "var(--text-muted)",
                      textAlign: col.align ?? "left",
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="border-b px-2 py-2"
                      style={{
                        borderColor: "var(--gridline)",
                        color: "var(--text-primary)",
                        textAlign: col.align ?? "left",
                        fontVariantNumeric:
                          col.align === "right" ? "tabular-nums" : undefined,
                      }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
