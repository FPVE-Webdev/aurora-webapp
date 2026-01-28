/**
 * Live Query Feed Component
 *
 * Displays a scrollable list of recent chat queries in real-time
 * Shows: query text, language, status, premium flag, timestamp
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Globe, Zap, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface ChatQuery {
  id: string;
  query_text: string;
  language: string;
  master_status: string;
  is_premium: boolean;
  created_at: string;
}

interface LiveQueryFeedProps {
  queries: ChatQuery[];
  isLoading?: boolean;
  isConnected?: boolean;
  maxQueries?: number;
}

const statusIcons: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  GO: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-400',
    label: 'Aurora Active',
  },
  WAIT: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-yellow-400',
    label: 'Aurora Possible',
  },
  NO: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-red-400',
    label: 'No Aurora',
  },
};

const languageNames: Record<string, string> = {
  en: 'English',
  no: 'Norsk',
  de: 'Deutsch',
  sv: 'Svenska',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  pl: 'Polski',
  ru: 'Русский',
};

function formatTimestamp(createdAt: string): string {
  try {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'unknown';
  }
}

function truncateQuery(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function LiveQueryFeed({
  queries,
  isLoading = false,
  isConnected = false,
  maxQueries = 30,
}: LiveQueryFeedProps) {
  const [displayQueries, setDisplayQueries] = useState<ChatQuery[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Limit queries to maxQueries
  useEffect(() => {
    setDisplayQueries(queries.slice(0, maxQueries));
  }, [queries, maxQueries]);

  // Auto-scroll to top when new queries arrive
  useEffect(() => {
    if (shouldAutoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [displayQueries.length]);

  const handleScroll = () => {
    if (containerRef.current) {
      shouldAutoScrollRef.current = containerRef.current.scrollTop < 50;
    }
  };

  if (isLoading && displayQueries.length === 0) {
    return (
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-8 text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-white/70">Loading live queries...</p>
      </div>
    );
  }

  if (displayQueries.length === 0) {
    return (
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-8 text-center">
        <MessageCircle className="w-8 h-8 text-white/20 mx-auto mb-4" />
        <p className="text-white/70">No queries yet. Waiting for incoming requests...</p>
      </div>
    );
  }

  return (
    <div className="bg-arctic-800 border border-white/10 rounded-lg flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 sticky top-0 bg-arctic-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Live Query Feed</h3>
            <span className="text-white/50 text-sm">({displayQueries.length})</span>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-mono ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
            {isConnected ? '● Live' : '● Polling'}
          </div>
        </div>
      </div>

      {/* Query List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-2 p-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {displayQueries.map((query) => {
          const status = statusIcons[query.master_status] || statusIcons['NO'];
          const langName = languageNames[query.language] || query.language || 'Unknown';

          return (
            <div
              key={query.id}
              className="bg-arctic-900 border border-white/5 rounded-lg p-3 hover:border-white/10 transition-colors"
            >
              {/* Query Text */}
              <p className="text-white/80 text-sm mb-2 truncate">{truncateQuery(query.query_text)}</p>

              {/* Metadata Row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {/* Language */}
                  <div className="flex items-center gap-1 text-white/60">
                    <Globe className="w-3 h-3" />
                    <span>{langName}</span>
                  </div>

                  {/* Status */}
                  <div className={`flex items-center gap-1 ${status.color}`}>
                    {status.icon}
                    <span>{status.label}</span>
                  </div>

                  {/* Premium */}
                  {query.is_premium && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Zap className="w-3 h-3" />
                      <span>Premium</span>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-white/40 font-mono ml-2">
                  {formatTimestamp(query.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/10 bg-arctic-900 text-xs text-white/50 text-center">
        Showing last {displayQueries.length} queries • Auto-scrolls to newest
      </div>
    </div>
  );
}
