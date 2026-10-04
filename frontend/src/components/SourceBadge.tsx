import type { MessageSource } from "../types/api.js";

export function SourceBadge({ source }: { source: MessageSource }) {
  const isAi = source === "ai";
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        isAi ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {isAi ? "AI" : "Template"}
    </span>
  );
}
