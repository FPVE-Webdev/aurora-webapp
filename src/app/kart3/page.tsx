'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Kart3Page() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new welcome page
    router.replace('/welcome');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-arctic-900">
      <div className="text-center">
        <p className="text-white/70">Redirecting to welcome...</p>
      </div>
    </div>
  );
}
