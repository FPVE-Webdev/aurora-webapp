'use client';

import { Building2, Key, BarChart3, Settings, Lock } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useState, useEffect } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated in session
    const auth = sessionStorage.getItem('admin_authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      if (response.ok) {
        sessionStorage.setItem('admin_authenticated', 'true');
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Authentication failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-arctic-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-arctic-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-arctic-800 border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
              <p className="text-white/60">Enter password to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-arctic-900 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center">{error}</div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
              >
                Unlock Admin
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
