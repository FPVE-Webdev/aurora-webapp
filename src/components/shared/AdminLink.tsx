'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminLink() {
  const pathname = usePathname();

  // Don't show admin link on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <Link
      href="/admin"
      className="fixed bottom-6 right-6 p-4 bg-arctic-800 hover:bg-arctic-700 border border-white/10 rounded-full shadow-lg transition-all hover:shadow-primary/20 group z-50"
      title="Admin Dashboard"
    >
      <Settings className="w-6 h-6 text-white/70 group-hover:text-primary transition-colors" />
    </Link>
  );
}
