'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [offline, setOffline] = useState(false);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {offline && (
        <div className="fixed left-0 right-0 top-0 z-[80] bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white">
          Offline mode. Showing cached data where available.
        </div>
      )}
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Hind Siliguri, sans-serif',
            fontSize: '0.9rem',
            borderRadius: '10px',
            maxWidth: '340px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
