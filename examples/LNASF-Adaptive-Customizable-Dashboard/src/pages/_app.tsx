// src/pages/_app.tsx
import { ThemeProvider } from '@/context/ThemeContext';
import { makeServer } from '@/lib/mockApi/server';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

// راه‌اندازی Mirage JS در محیط توسعه
if (process.env.NODE_ENV === 'development') {
  makeServer();
}

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <main className={inter.className}>
        <Component {...pageProps} />
      </main>
    </ThemeProvider>
  );
}