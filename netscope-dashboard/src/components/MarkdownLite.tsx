import type { ReactNode } from "react";

// Renders a small, safe subset of markdown that Cortex responses use:
// **bold** inline spans and "* " bullet lists. No HTML, no links, no
// arbitrary markup — just enough to stop literal asterisks showing up.

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList(key: string) {
    if (listBuffer.length > 0) {
      blocks.push(
        <ul key={key} className="list-disc space-y-0.5 pl-5">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      listBuffer = [];
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[*-]\s+(.*)$/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
      return;
    }
    flushList(`list-${i}`);
    if (trimmed.length === 0) {
      blocks.push(<div key={i} className="h-2" />);
    } else {
      blocks.push(<p key={i}>{renderInline(trimmed)}</p>);
    }
  });
  flushList("list-end");

  return <div className="flex flex-col gap-1">{blocks}</div>;
}
