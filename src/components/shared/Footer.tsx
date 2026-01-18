'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on immersive/map pages to avoid confusion and overlap
  const hideFooter = pathname === '/live' || pathname === '/kart3';

  if (hideFooter) return null;

  return (
    <footer className="relative z-10 mt-20 border-t border-white/5 bg-arctic-900/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Features */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Features</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-white/60 hover:text-primary text-xs transition-colors">
                  Live Aurora Status
                </Link>
              </li>
              <li>
                <Link href="/forecast" className="text-white/60 hover:text-primary text-xs transition-colors">
                  48h Forecast
                </Link>
              </li>
              <li>
                <Link href="/live" className="text-white/60 hover:text-primary text-xs transition-colors">
                  Live Map
                </Link>
              </li>
              <li>
                <Link href="/kart3" className="text-white/60 hover:text-primary text-xs transition-colors">
                  Aurora Visualization
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-white/60 hover:text-primary text-xs transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a href="/sitemap.xml" className="text-white/60 hover:text-primary text-xs transition-colors">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-white/60 hover:text-primary text-xs transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/60 hover:text-primary text-xs transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Aurora Tromsø</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Real-time Northern Lights forecast for Tromsø, Norway. Know exactly when and where to see aurora borealis.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/tromso.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-primary transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61586643456809"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-primary transition-colors"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} Nordlys Tromsø. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
