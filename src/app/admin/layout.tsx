import { Building2, Key, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
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
            <Link
              href="/"
              className="text-white/70 hover:text-white transition-colors text-sm"
            >
              Back to App
            </Link>
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
