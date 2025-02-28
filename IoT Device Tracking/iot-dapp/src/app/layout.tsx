'use client';

import { Inter } from 'next/font/google';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import Navbar from '../components/ui/Navbar';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

const projectId = '0807f900bb39818b70b27f58aa804c30';

const config = getDefaultConfig({
  appName: 'TraceNet',
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http()
  },
});

const queryClient = new QueryClient();

function ToasterProvider() {
  const { theme } = useTheme();
  return <Toaster richColors closeButton position="top-right" theme={theme as 'light' | 'dark'} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider chains={[sepolia]}>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <div className="relative flex min-h-screen flex-col">
                  <Navbar />
                  <div className="flex-1">
                    {children}
                  </div>
                </div>
                <ToasterProvider />
              </ThemeProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}