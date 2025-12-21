'use client';

import { useEffect, useState } from 'react';
import { Key, Loader2, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  organization_id: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'revoked' | 'expired';
  rate_limit: number;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchApiKeys() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/api-keys');

        if (res.status === 503) {
          setError('Supabase database not configured. B2B features are disabled.');
          setApiKeys([]);
        } else if (!res.ok) {
          throw new Error('Failed to fetch API keys');
        } else {
          const data = await res.json();
          setApiKeys(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API keys');
        console.error('API keys fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchApiKeys();
  }, []);

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'revoked':
        return 'bg-red-500/10 text-red-500';
      case 'expired':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-500/10 text-gray-400';
      case 'basic':
        return 'bg-blue-500/10 text-blue-400';
      case 'premium':
        return 'bg-purple-500/10 text-purple-400';
      case 'enterprise':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
          <p className="text-white/60">Manage API access keys for organizations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Generate New Key
        </button>
      </div>

      {/* Warning if Supabase not configured */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-500 text-2xl">⚠️</div>
            <div>
              <h3 className="text-yellow-500 font-semibold mb-1">Configuration Required</h3>
              <p className="text-white/70 text-sm">{error}</p>
              <p className="text-white/60 text-sm mt-2">
                To enable B2B features, configure Supabase environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      {apiKeys.length > 0 ? (
        <div className="bg-arctic-800 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-arctic-900 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Rate Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-arctic-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Key className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-white font-medium">{apiKey.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-white/70 font-mono text-sm">
                          {visibleKeys.has(apiKey.id)
                            ? `${apiKey.key_prefix}••••••••••••••••`
                            : `${apiKey.key_prefix}••••••••••••••••`}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-1 hover:bg-arctic-600 rounded transition-colors"
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="w-4 h-4 text-white/50" />
                          ) : (
                            <Eye className="w-4 h-4 text-white/50" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key_prefix)}
                          className="p-1 hover:bg-arctic-600 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4 text-white/50" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getTierColor(apiKey.tier)}`}>
                        {apiKey.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(apiKey.status)}`}>
                        {apiKey.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/70">{apiKey.rate_limit.toLocaleString()}/hr</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/60 text-sm">
                        {apiKey.last_used_at
                          ? new Date(apiKey.last_used_at).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !error ? (
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-12 text-center">
          <Key className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No API keys yet</h3>
          <p className="text-white/60 mb-6">Generate your first API key to get started</p>
          <button className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
            Generate API Key
          </button>
        </div>
      ) : null}
    </div>
  );
}
