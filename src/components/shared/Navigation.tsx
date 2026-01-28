'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapIcon, Calendar, Settings, Menu, X, Brain, Zap, Instagram, Facebook } from 'lucide-react';
import { useRetention } from '@/contexts/RetentionContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function Navigation() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { userMode, setUserMode } = useRetention();

  const navItems = [
    { href: '/home', label: t('home'), icon: Home, guideId: 'nav-home' },
    { href: '/live', label: t('liveMap'), icon: MapIcon, guideId: 'nav-live' },
    { href: '/forecast', label: t('forecast'), icon: Calendar, guideId: 'nav-forecast' },
    { href: '/settings', label: t('settings'), icon: Settings, guideId: 'nav-settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/home') {
      return pathname === '/home' || pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-arctic-900/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/home" className="flex items-center gap-2 text-white font-display font-bold text-xl">
            <span>{t('nordlysTromso')}</span>
          </Link>

          {/* Live Viewers & Mode Toggle - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {/* Social Links */}
            <div className="flex items-center gap-2 pl-4 border-l border-white/10">
              <a
                href="https://www.instagram.com/tromso.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                title="Follow on Instagram"
                aria-label="Follow on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61586347817859"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                title="Follow on Facebook"
                aria-label="Follow on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>

            {/* Tourist/Geek Mode Toggle */}
            <button
              onClick={() => setUserMode(userMode === 'tourist' ? 'geek' : 'tourist')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title={userMode === 'tourist' ? t('switchToGeekMode') : t('switchToTouristMode')}
            >
              {userMode === 'tourist' ? (
                <>
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-sm text-white/70">{t('tourist')}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm text-white/70">{t('geek')}</span>
                </>
              )}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-guide-id={item.guideId}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    active
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-white/10">
            {/* Mobile Social Links */}
            <div className="px-4 pb-2 flex items-center gap-2">
              <a
                href="https://www.instagram.com/tromso.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                title="Follow on Instagram"
              >
                <Instagram className="w-4 h-4" />
                <span className="text-sm">Instagram</span>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61586347817859"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                title="Follow on Facebook"
              >
                <Facebook className="w-4 h-4" />
                <span className="text-sm">Facebook</span>
              </a>
            </div>

            {/* Mobile Live Stats & Mode */}
            <div className="px-4 pb-2 space-y-2">
              <button
                onClick={() => setUserMode(userMode === 'tourist' ? 'geek' : 'tourist')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {userMode === 'tourist' ? (
                  <>
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-sm text-white/70">{t('touristMode')}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm text-white/70">{t('geekMode')}</span>
                  </>
                )}
              </button>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-guide-id={item.guideId}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
