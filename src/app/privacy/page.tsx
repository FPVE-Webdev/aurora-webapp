'use client';

import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Aurora glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-display font-bold text-white">Personvern</h1>
          </div>
        </div>

        <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-8">
          <div className="prose prose-invert max-w-none">
            <p className="text-white/80 text-sm mb-6">
              Sist oppdatert: Desember 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Introduksjon</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Denne personvernerklæringen beskriver hvordan Aurora.tromso.ai («vi», «oss», «vår»)
                samler inn, bruker og beskytter din informasjon når du bruker vår tjeneste.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Informasjon vi samler inn</h2>
              <h3 className="text-xl font-semibold text-white mb-3">Automatisk innsamlet informasjon</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
                <li>IP-adresse og enhetstype for å levere nordlysprognosen for ditt område</li>
                <li>Nettlesertype og versjon for teknisk kompatibilitet</li>
                <li>Besøkstidspunkt og bruksmønster for å forbedre tjenesten</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">Informasjon du oppgir</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Språkinnstillinger (norsk/engelsk)</li>
                <li>Temperaturenhetspreferanser (Celsius/Fahrenheit)</li>
                <li>Valgt observasjonssted for nordlysprognose</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Hvordan vi bruker informasjonen</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Vi bruker den innsamlede informasjonen til følgende formål:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Levere nordlysprognoser basert på din geografiske plassering</li>
                <li>Tilpasse brukergrensesnittet etter dine preferanser</li>
                <li>Forbedre og optimalisere tjenesten</li>
                <li>Feilsøking og teknisk support</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Datalagring</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Vi lagrer dine preferanser lokalt i nettleseren din ved hjelp av localStorage.
                Denne informasjonen forblir på din enhet og sendes ikke til våre servere.
              </p>
              <p className="text-white/70 leading-relaxed">
                Prognosedata caches i din nettleser i 5 minutter for å redusere serverbelastning.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Tredjepartstjenester</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Vi henter data fra følgende tredjepartstjenester:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li><strong>Tromsø.AI</strong> - Aurora forecast API</li>
                <li><strong>MET.no</strong> - Værmeldinger og KP-indeks</li>
                <li><strong>NOAA</strong> - Solaktivitetsdata</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                Disse tjenestene har egne personvernerklæringer som du bør gjennomgå.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Informasjonskapsler (Cookies)</h2>
              <p className="text-white/70 leading-relaxed">
                Vi bruker kun teknisk nødvendige informasjonskapsler for å opprettholde
                dine preferanser. Vi bruker ikke sporings- eller markedsføringskapslervår.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Dine rettigheter</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Du har rett til å:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Slette dine lagrede preferanser ved å tømme nettleserens localStorage</li>
                <li>Nekte bruk av informasjonskapsler i nettleserinnstillingene</li>
                <li>Be om informasjon om hvilke data vi har om deg</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Endringer i personvernerklæringen</h2>
              <p className="text-white/70 leading-relaxed">
                Vi kan oppdatere denne personvernerklæringen fra tid til annen.
                Eventuelle endringer vil bli publisert på denne siden med oppdatert dato.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Kontakt oss</h2>
              <p className="text-white/70 leading-relaxed">
                Har du spørsmål om vår personvernerklæring? Ta kontakt med oss via innstillingssiden.
              </p>
            </section>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 flex justify-between">
          <Link
            href="/settings"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            ← Innstillinger
          </Link>
          <Link
            href="/terms"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Vilkår for bruk →
          </Link>
        </div>
      </div>
    </div>
  );
}
