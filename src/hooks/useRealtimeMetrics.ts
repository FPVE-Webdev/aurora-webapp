/**
 * Real-Time Metrics Hook
 *
 * Calculates live metrics from recent chat queries
 * Updates every second with the latest data
 */

import { useEffect, useState, useCallback } from 'react';
import type { ChatQuery, RealTimeMetrics } from '@/utils/metricsCalculator';
import {
  calculateMetrics,
  formatMetrics,
  getMetricsTimeline,
} from '@/utils/metricsCalculator';

interface UseRealtimeMetricsOptions {
  queries: ChatQuery[];
  enabled?: boolean;
}

interface FormattedMetrics {
  activeUsers: number;
  queriesPerMinute: string;
  premiumPercentage: string;
  topLanguages: Array<{ language: string; count: number }>;
  topStatuses: Array<{ status: string; count: number }>;
}

interface MetricsTimeline {
  timestamp: string;
  count: number;
  queriesPerMinute: number;
}

export function useRealtimeMetrics(
  options: UseRealtimeMetricsOptions
) {
  const { queries, enabled = true } = options;

  const [metrics, setMetrics] = useState<FormattedMetrics | null>(null);
  const [timeline, setTimeline] = useState<MetricsTimeline[]>([]);
  const [rawMetrics, setRawMetrics] = useState<RealTimeMetrics | null>(null);

  /**
   * Calculate and update metrics
   */
  const updateMetrics = useCallback(() => {
    if (!enabled || !queries || queries.length === 0) {
      setMetrics(null);
      setTimeline([]);
      setRawMetrics(null);
      return;
    }

    try {
      const calculated = calculateMetrics(queries);
      const formatted = formatMetrics(calculated);
      const timelineData = getMetricsTimeline(queries);

      setMetrics(formatted);
      setTimeline(timelineData);
      setRawMetrics(calculated);
    } catch (error) {
      console.error('[useRealtimeMetrics] Calculation error:', error);
    }
  }, [queries, enabled]);

  /**
   * Update metrics whenever queries change or on a timer
   */
  useEffect(() => {
    updateMetrics();

    // Also refresh metrics every 1 second for smooth updates
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, [updateMetrics]);

  return {
    metrics,
    timeline,
    rawMetrics,
  };
}
