/**
 * Metrics Calculator Utility
 *
 * Helper functions for calculating real-time metrics from chat queries
 */

export interface ChatQuery {
  id: string;
  query_text: string;
  language: string;
  master_status: string;
  is_premium: boolean;
  created_at: string;
}

export interface RealTimeMetrics {
  activeUsers: number;
  queriesPerMinute: number;
  averageResponseTime: number;
  topLanguages: Array<{ language: string; count: number }>;
  topStatuses: Array<{ status: string; count: number }>;
  premiumPercentage: number;
}

/**
 * Calculate metrics from a list of recent queries
 */
export function calculateMetrics(queries: ChatQuery[]): RealTimeMetrics {
  if (!queries || queries.length === 0) {
    return {
      activeUsers: 0,
      queriesPerMinute: 0,
      averageResponseTime: 0,
      topLanguages: [],
      topStatuses: [],
      premiumPercentage: 0,
    };
  }

  // Calculate queries per minute (estimated from recent queries)
  const metricsQueriesPerMinute = estimateQueriesPerMinute(queries);

  // Calculate language distribution
  const languageMap = new Map<string, number>();
  queries.forEach((q) => {
    const lang = q.language || 'unknown';
    languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
  });

  const topLanguages = Array.from(languageMap.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate status distribution
  const statusMap = new Map<string, number>();
  queries.forEach((q) => {
    const status = q.master_status || 'unknown';
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  const topStatuses = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate premium percentage
  const premiumCount = queries.filter((q) => q.is_premium).length;
  const premiumPercentage = (premiumCount / queries.length) * 100;

  return {
    activeUsers: estimateActiveUsers(queries),
    queriesPerMinute: metricsQueriesPerMinute,
    averageResponseTime: 0, // Chat queries don't have response time - would need API logs
    topLanguages,
    topStatuses,
    premiumPercentage: Math.round(premiumPercentage * 10) / 10,
  };
}

/**
 * Estimate queries per minute based on the timestamp distribution
 */
export function estimateQueriesPerMinute(queries: ChatQuery[]): number {
  if (queries.length < 2) return 0;

  // Get the oldest and newest query timestamps
  const timestamps = queries.map((q) => new Date(q.created_at).getTime());
  const oldestTime = Math.min(...timestamps);
  const newestTime = Math.max(...timestamps);

  // Calculate time span in minutes
  const timeSpanMinutes = (newestTime - oldestTime) / (1000 * 60);

  // Avoid division by zero
  if (timeSpanMinutes === 0) return queries.length;

  // Calculate QPM
  return Math.round((queries.length / timeSpanMinutes) * 10) / 10;
}

/**
 * Estimate active users based on queries in the last 5 minutes
 * Since we don't track user IDs, we use unique query sources (all are essentially "active users")
 */
export function estimateActiveUsers(queries: ChatQuery[]): number {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const recentQueries = queries.filter(
    (q) => new Date(q.created_at).getTime() > fiveMinutesAgo
  );

  // Since queries are anonymous, we estimate unique users by assuming
  // roughly 1 query per active user in the 5-minute window
  return Math.max(1, recentQueries.length);
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: RealTimeMetrics) {
  return {
    activeUsers: metrics.activeUsers,
    queriesPerMinute: metrics.queriesPerMinute.toFixed(1),
    premiumPercentage: metrics.premiumPercentage.toFixed(1),
    topLanguages: metrics.topLanguages,
    topStatuses: metrics.topStatuses,
  };
}

/**
 * Calculate timestamp for QPM graph (last 30 minutes)
 */
export function getMetricsTimeline(queries: ChatQuery[]): Array<{
  timestamp: string;
  count: number;
  queriesPerMinute: number;
}> {
  if (!queries.length) return [];

  // Group by minute
  const minuteBuckets = new Map<string, number>();

  queries.forEach((q) => {
    const date = new Date(q.created_at);
    // Round to nearest minute
    date.setSeconds(0, 0);
    const key = date.toISOString();
    minuteBuckets.set(key, (minuteBuckets.get(key) || 0) + 1);
  });

  // Convert to sorted array
  return Array.from(minuteBuckets.entries())
    .map(([timestamp, count]) => ({
      timestamp,
      count,
      queriesPerMinute: count, // 1 minute bucket = QPM value
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
