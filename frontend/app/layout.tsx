import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Arabic Sign Language Platform',
  description: 'Real-time Arabic Sign Language recognition using AI',
  keywords: ['Arabic Sign Language', 'ASL', 'AI', 'Computer Vision', 'Accessibility'],
  authors: [{ name: 'Arabic Sign Language AI Team' }],
  creator: 'Arabic Sign Language AI Team',
  publisher: 'Arabic Sign Language AI Team',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://arabic-sign-language.ai',
    title: 'Arabic Sign Language Platform',
    description: 'Real-time Arabic Sign Language recognition using AI',
    siteName: 'Arabic Sign Language Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arabic Sign Language Platform',
    description: 'Real-time Arabic Sign Language recognition using AI',
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const htmlLang = 'en';
  const htmlDir = 'ltr';

  return (
    <html lang={htmlLang} dir={htmlDir} className={`${inter.variable} ${notoSansArabic.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'glass-card',
              style: {
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}