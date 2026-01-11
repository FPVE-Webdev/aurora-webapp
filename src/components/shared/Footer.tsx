'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // Hide footer on immersive/map pages to avoid confusion and overlap
  const hideFooter = pathname === '/live' || pathname === '/kart3';
  
  if (hideFooter) return null;
  
  return (
    <footer className="fixed bottom-4 right-4 z-10">
      <a
        href="/kart3"
        className="underline opacity-60 hover:opacity-100 text-xs"
      >
        Se aurora-visualisering
      </a>
    </footer>
  );
}
