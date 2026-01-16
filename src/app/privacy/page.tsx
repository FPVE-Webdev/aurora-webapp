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
            Back
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-display font-bold text-white">Privacy Policy</h1>
          </div>
        </div>

        <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-8">
          <div className="prose prose-invert max-w-none">
            <p className="text-white/80 text-sm mb-6">
              Last updated: December 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                This privacy policy describes how Aurora.tromso.ai ("we", "us", "our")
                collects, uses and protects your information when you use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
              <h3 className="text-xl font-semibold text-white mb-3">Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
                <li>IP address and device type to deliver aurora forecasts for your area</li>
                <li>Browser type and version for technical compatibility</li>
                <li>Visit time and usage patterns to improve the service</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">Information You Provide</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Language preferences (Norwegian/English)</li>
                <li>Temperature unit preferences (Celsius/Fahrenheit)</li>
                <li>Selected observation spot for aurora forecast</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Deliver aurora forecasts based on your geographic location</li>
                <li>Customize the user interface according to your preferences</li>
                <li>Improve and optimize the service</li>
                <li>Troubleshooting and technical support</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Storage</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We store your preferences locally in your browser using localStorage.
                This information remains on your device and is not sent to our servers.
              </p>
              <p className="text-white/70 leading-relaxed">
                Forecast data is cached in your browser for 5 minutes to reduce server load.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Third-Party Services</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We retrieve data from the following third-party services:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li><strong>Tromsø.AI</strong> - Aurora forecast API</li>
                <li><strong>MET.no</strong> - Weather forecasts and KP index</li>
                <li><strong>NOAA</strong> - Solar activity data</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                These services have their own privacy policies that you should review.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Cookies</h2>
              <p className="text-white/70 leading-relaxed">
                We only use technically necessary cookies to maintain your preferences.
                We do not use tracking or marketing cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Delete your stored preferences by clearing your browser's localStorage</li>
                <li>Refuse the use of cookies in your browser settings</li>
                <li>Request information about what data we have about you</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Privacy Policy</h2>
              <p className="text-white/70 leading-relaxed">
                We may update this privacy policy from time to time.
                Any changes will be published on this page with an updated date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
              <p className="text-white/70 leading-relaxed">
                Do you have questions about our privacy policy? Contact us via the settings page.
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
            ← Settings
          </Link>
          <Link
            href="/terms"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
