'use client';

import { Building2, Key, BarChart3, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear the auth cookie by calling logout API
    await fetch('/api/admin/logout', { method: 'POST' });
    // Force browser to forget credentials
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Header */}
      <header className="bg-arctic-800 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-white hover:text-primary transition-colors">
                Aurora Admin
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/admin"
                  className="text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/organizations"
                  className="text-white/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Organizations
                </Link>
                <Link
                  href="/admin/api-keys"
                  className="text-white/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  API Keys
                </Link>
                <Link
                  href="/admin/analytics"
                  className="text-white/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Link>
                <Link
                  href="/admin/settings"
                  className="text-white/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-white/70 hover:text-white transition-colors text-sm"
              >
                Back to App
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
