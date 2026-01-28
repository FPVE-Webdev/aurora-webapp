/**
 * Real-Time Chat Queries Hook
 *
 * Subscribes to live chat queries from Supabase real-time API
 * Falls back to polling if Realtime is unavailable
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface ChatQuery {
  id: string;
  query_text: string;
  language: string;
  master_status: string;
  is_premium: boolean;
  created_at: string;
}

interface UseRealtimeChatQueriesOptions {
  limit?: number;
  onError?: (error: Error) => void;
}

export function useRealtimeChatQueries(
  options: UseRealtimeChatQueriesOptions = {}
) {
  const { limit = 30, onError } = options;

  const [queries, setQueries] = useState<ChatQuery[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track subscription and polling
  const subscriptionRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  /**
   * Fetch recent queries via API (fallback method)
   */
  const fetchQueriesViaApi = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/analytics/live?limit=${limit}&since=${lastFetchTimeRef.current}`
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      if (data.queries && Array.isArray(data.queries)) {
        setQueries((prev) => {
          // Merge new queries, avoiding duplicates
          const merged = [...data.queries, ...prev];
          const seen = new Set<string>();
          const unique = merged.filter((q) => {
            if (seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
          return unique.slice(0, limit);
        });

        lastFetchTimeRef.current = Date.now();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch queries');
      console.error('[useRealtimeChatQueries] API fetch error:', error);
      setError(error);
      if (onError) onError(error);
    }
  }, [limit, onError]);

  /**
   * Start polling as fallback
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Fetch immediately
    fetchQueriesViaApi();

    // Then poll every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchQueriesViaApi();
    }, 5000);
  }, [fetchQueriesViaApi]);

  /**
   * Initialize real-time subscription
   */
  useEffect(() => {
    let isMounted = true;

    async function initializeRealtime() {
      try {
        setIsLoading(true);
        setError(null);

        // First, fetch initial data
        const { data, error: fetchError } = await supabase
          .from('chat_queries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) {
          throw fetchError;
        }

        if (isMounted) {
          setQueries(data || []);
          lastFetchTimeRef.current = Date.now();
        }

        // Try to subscribe to real-time updates
        const subscription = supabase
          .channel('chat_queries_realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_queries',
            },
            (payload) => {
              if (isMounted) {
                const newQuery = payload.new as ChatQuery;
                setQueries((prev) => [newQuery, ...prev].slice(0, limit));
              }
            }
          )
          .subscribe((status) => {
            if (isMounted) {
              if (status === 'SUBSCRIBED') {
                setIsConnected(true);
                setIsLoading(false);
              } else if (status === 'CHANNEL_ERROR') {
                setIsConnected(false);
                // Start polling as fallback
                startPolling();
                setIsLoading(false);
              }
            }
          });

        subscriptionRef.current = subscription;

        // Fallback: if no connection after 2 seconds, start polling
        const fallbackTimer = setTimeout(() => {
          if (!isConnected && isMounted) {
            startPolling();
          }
        }, 2000);

        return () => clearTimeout(fallbackTimer);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Realtime setup failed');
        console.error('[useRealtimeChatQueries] Init error:', error);

        if (isMounted) {
          setError(error);
          setIsLoading(false);
          // Fall back to polling
          startPolling();
        }

        if (onError) onError(error);
      }
    }

    initializeRealtime();

    return () => {
      isMounted = false;
    };
  }, [limit, startPolling, onError, isConnected]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Unsubscribe from realtime
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    queries,
    isLoading,
    isConnected,
    error,
  };
}
