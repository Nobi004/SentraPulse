export function buildSignature(apiName: string, types: string[]): string {
  return `${apiName}:${[...types].sort().join("|")}`;
}
