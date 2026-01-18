'use client';

import { Syne } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TemperatureProvider } from '@/contexts/TemperatureContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { KpIndexProvider } from '@/contexts/KpIndexContext';
import { DevModeProvider } from '@/contexts/DevModeContext';
import { DataModeProvider } from '@/contexts/DataModeContext';
import { RetentionProvider } from '@/contexts/RetentionContext';
import { MasterStatusProvider } from '@/contexts/MasterStatusContext';
import { AuroraDataProvider } from '@/contexts/AuroraDataContext';
import { WelcomeProvider } from '@/contexts/WelcomeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Navigation } from '@/components/shared/Navigation';
import Footer from '@/components/shared/Footer';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { AuraRoot } from '../../aura/AuraRoot';
import { UIGuideProvider } from '@/components/guide/UIGuideProvider';
import { StructuredData } from '@/components/seo/StructuredData';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useServiceWorker } from '@/hooks/useServiceWorker';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isImmersiveRoute = pathname === '/kart3';

  return (
    <>
      {!isAdminRoute && !isImmersiveRoute && <Navigation />}
      <div className={!isAdminRoute && !isImmersiveRoute ? 'pt-16' : ''}>
        {children}
      </div>
      {!isAdminRoute && !isImmersiveRoute && <Footer />}
    </>
  );
}

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  }));

  // Register service worker for push notifications
  useServiceWorker();

  return (
    <html lang="no">
      <body className={`${syne.variable} font-sans antialiased bg-arctic-900`}>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <LanguageProvider>
              <TemperatureProvider>
                <KpIndexProvider>
                  <DevModeProvider>
                    <DataModeProvider>
                      <AuroraDataProvider>
                        <PremiumProvider>
                          <RetentionProvider>
                            <MasterStatusProvider>
                              <WelcomeProvider>
                                <UIGuideProvider>
                                  <StructuredData />
                                  <LayoutContent>{children}</LayoutContent>
                                  <ChatWidget />
                                  <AuraRoot />
                                </UIGuideProvider>
                                <Toaster
                                  position="top-right"
                                  theme="dark"
                                  toastOptions={{
                                    style: {
                                      background: 'rgb(15, 17, 24)',
                                      border: '1px solid rgba(255, 255, 3, 0.1)',
                                      color: 'white',
                                    },
                                  }}
                                />
                              </WelcomeProvider>
                            </MasterStatusProvider>
                          </RetentionProvider>
                        </PremiumProvider>
                      </AuroraDataProvider>
                    </DataModeProvider>
                  </DevModeProvider>
                </KpIndexProvider>
              </TemperatureProvider>
            </LanguageProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
