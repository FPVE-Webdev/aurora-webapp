'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePremium } from '@/contexts/PremiumContext';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { checkSubscriptionStatus } = usePremium();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setError('Ingen betalingssesjon funnet');
      setIsVerifying(false);
      return;
    }

    // Verify subscription with backend
    const verify = async () => {
      try {
        await checkSubscriptionStatus();
        setIsVerifying(false);
      } catch (err) {
        console.error('Verification error:', err);
        setError('Kunne ikke verifisere betaling');
        setIsVerifying(false);
      }
    };

    verify();
  }, [searchParams, checkSubscriptionStatus]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verifiserer betaling...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Noe gikk galt</h1>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            Gå til forsiden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6">
          <CheckCircle className="w-12 h-12 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Betaling vellykket!</h1>
        <p className="text-slate-300 mb-8">
          Du har nå full tilgang til alle premium-funksjoner i Nordlys Tromsø-appen.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-white font-semibold mb-3">Premium-funksjoner aktivert:</h2>
          <ul className="text-left space-y-2 text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              GPS-navigasjon til beste observasjonspunkt
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              AI-guide med kjøreinstruksjoner
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              24-timers detaljert prognose
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              Live kart med sanntidsdata
            </li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
        >
          Start nordlysjakt
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-slate-500 text-sm mt-6">
          Kvittering er sendt til din e-post
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
