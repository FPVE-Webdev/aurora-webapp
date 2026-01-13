'use client';

import { Syne } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TemperatureProvider } from '@/contexts/TemperatureContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { DevModeProvider } from '@/contexts/DevModeContext';
import { DataModeProvider } from '@/contexts/DataModeContext';
import { RetentionProvider } from '@/contexts/RetentionContext';
import { MasterStatusProvider } from '@/contexts/MasterStatusContext';
import { AuroraDataProvider } from '@/contexts/AuroraDataContext';
import { Navigation } from '@/components/shared/Navigation';
import Footer from '@/components/shared/Footer';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { AuraRoot } from '../../aura/AuraRoot';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isImmersiveRoute = pathname === '/kart2' || pathname === '/kart3' || pathname === '/live';

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

  return (
    <html lang="no">
      <body className={`${syne.variable} font-sans antialiased bg-arctic-900`}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <TemperatureProvider>
              <DevModeProvider>
                <DataModeProvider>
                  <AuroraDataProvider>
                    <PremiumProvider>
                      <RetentionProvider>
                        <MasterStatusProvider>
                          <LayoutContent>{children}</LayoutContent>
                          <ChatWidget />
                          <AuraRoot />
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
                        </MasterStatusProvider>
                      </RetentionProvider>
                    </PremiumProvider>
                  </AuroraDataProvider>
                </DataModeProvider>
              </DevModeProvider>
            </TemperatureProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
