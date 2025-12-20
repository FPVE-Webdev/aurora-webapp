'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
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
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-display font-bold text-white">Vilkår for bruk</h1>
          </div>
        </div>

        <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-8">
          <div className="prose prose-invert max-w-none">
            <p className="text-white/80 text-sm mb-6">
              Sist oppdatert: Desember 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Aksept av vilkår</h2>
              <p className="text-white/70 leading-relaxed">
                Ved å bruke Aurora.tromso.ai («Tjenesten») godtar du disse vilkårene for bruk.
                Hvis du ikke godtar vilkårene, må du ikke bruke Tjenesten.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Tjenestebeskrivelse</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Aurora.tromso.ai er en gratis nordlysprognose-tjeneste som gir:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Live nordlysprognoser basert på solaktivitet og værforhold</li>
                <li>Interaktive kart med 30+ observasjonssteder</li>
                <li>12-timers animert nordlysprognose</li>
                <li>Værdata og optimal visningstid</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Ansvarsfraskrivelse</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Nordlysprognoser er basert på vitenskapelige data, men kan ikke garanteres 100% nøyaktige:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Prognosene er kun veiledende og kan ikke garanteres</li>
                <li>Faktiske nordlysforhold kan avvike fra prognosen</li>
                <li>Vi er ikke ansvarlige for feiltolkninger eller tap som følge av bruk av tjenesten</li>
                <li>Tjenesten leveres «som den er» uten garantier av noe slag</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Datakilder</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Tjenesten henter data fra følgende kilder:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li><strong>NOAA</strong> - KP-indeks og solaktivitet</li>
                <li><strong>MET.no</strong> - Værmeldinger for Norge</li>
                <li><strong>Tromsø.AI</strong> - Nordlysprognoser og AI-baserte anbefalinger</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                Vi er ikke ansvarlige for feil eller forsinkelser i data fra tredjepartskilder.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Begrensninger i bruk</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Du godtar å ikke:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Bruke Tjenesten til ulovlige formål</li>
                <li>Forsøke å hacke, overvelde eller forstyrre Tjenesten</li>
                <li>Kopiere, reprodusere eller videresalge Tjenestens innhold uten tillatelse</li>
                <li>Bruke automatiserte systemer til å trekke ut data (web scraping)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Opphavsrett</h2>
              <p className="text-white/70 leading-relaxed">
                Alt innhold på Aurora.tromso.ai, inkludert design, kode og tekstmateriell,
                er beskyttet av opphavsrett. Du kan ikke kopiere eller redistribuere innholdet
                uten skriftlig tillatelse.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Tilgjengelighet</h2>
              <p className="text-white/70 leading-relaxed">
                Vi tilstreber 24/7 tilgjengelighet, men kan ikke garantere at Tjenesten
                alltid vil være tilgjengelig. Vi kan midlertidig stanse Tjenesten for
                vedlikehold, oppdateringer eller andre grunner uten forvarsel.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Endringer i vilkår</h2>
              <p className="text-white/70 leading-relaxed">
                Vi forbeholder oss retten til å endre disse vilkårene når som helst.
                Endringer trer i kraft umiddelbart etter publisering. Din fortsatte bruk
                av Tjenesten etter endringer utgjør aksept av de oppdaterte vilkårene.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Ansvarsgrense</h2>
              <p className="text-white/70 leading-relaxed">
                I den grad loven tillater det, er vår ansvar begrenset til maksimalt
                det beløpet du har betalt for bruk av Tjenesten (for gratis brukere: 0 NOK).
                Vi er ikke ansvarlige for indirekte tap, tapte inntekter eller følgeskader.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Gjeldende lov</h2>
              <p className="text-white/70 leading-relaxed">
                Disse vilkårene reguleres av norsk lov. Eventuelle tvister skal løses
                i norske domstoler.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Kontakt</h2>
              <p className="text-white/70 leading-relaxed">
                Har du spørsmål om vilkårene? Kontakt oss via innstillingssiden.
              </p>
            </section>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 flex justify-between">
          <Link
            href="/privacy"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            ← Personvern
          </Link>
          <Link
            href="/settings"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Innstillinger →
          </Link>
        </div>
      </div>
    </div>
  );
}
