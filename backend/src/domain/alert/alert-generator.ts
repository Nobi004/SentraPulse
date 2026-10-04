export interface AlertGenerationInput {
  apiName: string;
  severity: string;
  anomalyTypes: string[];
  reasons: string[];
  metrics: {
    responseTimeMs: number | null;
    statusCode: number | null;
    recordsReturned: number | null;
  };
  context?: {
    sampleSize: number;
    medianResponseTimeMs: number | null;
    anomalyCount: number;
  };
}

export interface AlertGenerator {
  generate(input: AlertGenerationInput): Promise<string>;
}
