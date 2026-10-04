interface FallbackInput {
  apiName: string;
  severity: string;
  reasons: string[];
}

export function buildFallbackMessage(input: FallbackInput): string {
  return `${input.severity.toUpperCase()}: ${input.apiName} — ${input.reasons.join("; ")}.`;
}
