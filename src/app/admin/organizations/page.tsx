'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, Key, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
  subscription?: {
    tier: string;
    status: string;
  };
  users?: { count: number }[];
  api_keys?: { count: number }[];
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/organizations').catch(() => null);

        if (!res) {
          setError('Failed to connect to API');
          setOrganizations([]);
        } else if (res.status === 503) {
          setError('Supabase database not configured. B2B features are disabled.');
          setOrganizations([]);
        } else if (res.status === 401) {
          setError('Authentication required. Please configure API authentication.');
          setOrganizations([]);
        } else if (!res.ok) {
          setError('Failed to fetch organizations');
          setOrganizations([]);
        } else {
          const data = await res.json().catch(() => null);
          setOrganizations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setError('Failed to load organizations');
        // Suppress console error - already handled in UI
        setOrganizations([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'trial':
        return 'bg-blue-500/10 text-blue-500';
      case 'suspended':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Organizations</h1>
          <p className="text-white/60">Manage B2B customer organizations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          New Organization
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

      {/* Organizations Table */}
      {organizations.length > 0 ? (
        <div className="bg-arctic-800 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-arctic-900 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    API Keys
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-arctic-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{org.name}</p>
                          <p className="text-white/60 text-sm">{org.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(org.status)}`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/70">
                        {org.subscription?.tier || 'No subscription'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <Users className="w-4 h-4" />
                        <span>{org.users?.[0]?.count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <Key className="w-4 h-4" />
                        <span>{org.api_keys?.[0]?.count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/60 text-sm">
                        {new Date(org.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-arctic-600 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-white/70" />
                        </button>
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
          <Building2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No organizations yet</h3>
          <p className="text-white/60 mb-6">Create your first organization to get started</p>
          <button className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
            Create Organization
          </button>
        </div>
      ) : null}
    </div>
  );
}
