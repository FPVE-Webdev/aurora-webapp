'use client';

import { useEffect } from 'react';
import { AuroraLiveMap } from '@/components/aurora/AuroraLiveMap';

export default function LivePage() {
  useEffect(() => {
    // #region agent log
    console.log('[debug-live] live/page mount');
    fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/live/page.tsx:8',message:'live page mounted',data:{path:typeof window!=='undefined'?window.location.pathname:'(server)'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
  }, []);

  return <AuroraLiveMap />;
}
