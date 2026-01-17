'use client';

import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function PaymentCancelledPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/20 mb-6">
          <XCircle className="w-12 h-12 text-amber-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Betaling avbrutt</h1>
        <p className="text-slate-300 mb-8">
          Du avbrøt betalingsprosessen. Ingen bekymring – du kan prøve igjen når som helst.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake til appen
          </button>
        </div>

        <p className="text-slate-500 text-sm mt-6">
          Har du spørsmål? Kontakt oss på{' '}
          <a href="mailto:support@tromso.ai" className="text-primary hover:underline">
            support@tromso.ai
          </a>
        </p>
      </div>
    </div>
  );
}
