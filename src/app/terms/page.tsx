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
            Back
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-display font-bold text-white">Terms of Service</h1>
          </div>
        </div>

        <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-8">
          <div className="prose prose-invert max-w-none">
            <p className="text-white/80 text-sm mb-6">
              Last updated: December 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Acceptance of Terms</h2>
              <p className="text-white/70 leading-relaxed">
                By using Aurora.tromso.ai ("the Service"), you agree to these terms of use.
                If you do not agree to these terms, you must not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Service Description</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Aurora.tromso.ai is a free aurora forecast service that provides:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Live aurora forecasts based on solar activity and weather conditions</li>
                <li>Interactive maps with 30+ observation spots</li>
                <li>12-hour animated aurora forecast</li>
                <li>Weather data and optimal viewing times</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Disclaimer</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Aurora forecasts are based on scientific data but cannot be guaranteed 100% accurate:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Forecasts are for guidance only and cannot be guaranteed</li>
                <li>Actual aurora conditions may differ from the forecast</li>
                <li>We are not responsible for misinterpretations or losses resulting from use of the service</li>
                <li>The Service is provided "as is" without warranties of any kind</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Sources</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                The Service retrieves data from the following sources:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li><strong>NOAA</strong> - KP index and solar activity</li>
                <li><strong>MET.no</strong> - Weather forecasts for Norway</li>
                <li><strong>Tromsø.AI</strong> - Aurora forecasts and AI-based recommendations</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                We are not responsible for errors or delays in data from third-party sources.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Usage Restrictions</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Use the Service for illegal purposes</li>
                <li>Attempt to hack, overwhelm, or disrupt the Service</li>
                <li>Copy, reproduce, or resell the Service's content without permission</li>
                <li>Use automated systems to extract data (web scraping)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Copyright</h2>
              <p className="text-white/70 leading-relaxed">
                All content on Aurora.tromso.ai, including design, code, and text material,
                is protected by copyright. You may not copy or redistribute the content
                without written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Availability</h2>
              <p className="text-white/70 leading-relaxed">
                We strive for 24/7 availability, but cannot guarantee that the Service
                will always be available. We may temporarily suspend the Service for
                maintenance, updates, or other reasons without notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to Terms</h2>
              <p className="text-white/70 leading-relaxed">
                We reserve the right to change these terms at any time.
                Changes take effect immediately upon publication. Your continued use
                of the Service after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
              <p className="text-white/70 leading-relaxed">
                To the extent permitted by law, our liability is limited to a maximum of
                the amount you have paid for use of the Service (for free users: 0 NOK).
                We are not liable for indirect losses, lost revenue, or consequential damages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Governing Law</h2>
              <p className="text-white/70 leading-relaxed">
                These terms are governed by Norwegian law. Any disputes shall be resolved
                in Norwegian courts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
              <p className="text-white/70 leading-relaxed">
                Do you have questions about the terms? Contact us via the settings page.
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
            ← Privacy Policy
          </Link>
          <Link
            href="/settings"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Settings →
          </Link>
        </div>
      </div>
    </div>
  );
}
