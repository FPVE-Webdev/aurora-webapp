'use client';

import { useEffect } from 'react';
import { AuroraLiveMap } from '@/components/aurora/AuroraLiveMap';

export function LivePageClient() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[debug-live] live/page mount');
    }

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
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      console.error('[debug-live] unhandledrejection', {
        reasonName: reason?.name,
        reasonMessage: reason?.message,
        stack: reason?.stack,
        reason,
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return <AuroraLiveMap />;
}
