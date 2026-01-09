'use client';

import { useEffect } from 'react';
import { AuroraLiveMap } from '@/components/aurora/AuroraLiveMap';

export default function LivePage() {
  useEffect(() => {
    // #region agent log
    console.log('[debug-live] live/page mount');
    fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/live/page.tsx:8',message:'live page mounted',data:{path:typeof window!=='undefined'?window.location.pathname:'(server)'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    // #region agent log
    const onError = (event: ErrorEvent) => {
      console.error('[debug-live] window.error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorName: event.error?.name,
        errorMessage: event.error?.message,
        stack: event.error?.stack,
      });
      fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/live/page.tsx:23',message:'window.error',data:{message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno,errorName:event.error?.name,errorMessage:event.error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      console.error('[debug-live] unhandledrejection', {
        reasonName: reason?.name,
        reasonMessage: reason?.message,
        stack: reason?.stack,
        reason,
      });
      fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/live/page.tsx:39',message:'unhandledrejection',data:{reasonName:reason?.name,reasonMessage:reason?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    // #endregion

    return () => {
      // #region agent log
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      // #endregion
    };
  }, []);

  return <AuroraLiveMap />;
}
