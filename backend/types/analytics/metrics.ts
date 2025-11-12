export interface DateRange {
  from: string; // ISO
  to: string;   // ISO
}

export interface AnalyticsFilters {
  tenantId: string;
  userId?: string;
  pipeline?: string;
  stage?: string;
  ownerId?: string;
}

export interface MetricSeriesPoint {
  t: string; // ISO date at day resolution
  v: number; // value
}

export interface MetricSeries {
  name: string;
  points: MetricSeriesPoint[];
}

export interface AnalyticsResponse {
  series: MetricSeries[];
  meta?: Record<string, unknown>;
}
