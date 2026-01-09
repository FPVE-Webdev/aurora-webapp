import { redirect } from 'next/navigation';

export default function LivePage() {
  // Redirect legacy /live link to the new Kart3 experience
  redirect('/kart3');
}
'use client';

import { AuroraLiveMap } from '@/components/aurora/AuroraLiveMap';

export default function LiveMapPage() {
  return <AuroraLiveMap />;
}
