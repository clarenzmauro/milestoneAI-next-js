import type { Metadata } from 'next';
import { Suspense } from 'react';
import './index.css';
import Providers from './providers';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'MilestoneAI - AI-Powered 90-Day Planning',
  description: 'Generate and track your 90-day plan with AI assistance. Transform your goals into actionable milestones with intelligent insights and progress tracking.',
  keywords: ['AI planning', 'goal tracking', 'milestone management', 'productivity', 'project planning', '90-day plan'],
  authors: [{ name: 'MilestoneAI Team' }],
  creator: 'MilestoneAI',
  publisher: 'MilestoneAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://milestone-ai-next-js-web.vercel.app/'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'MilestoneAI - AI-Powered 90-Day Planning',
    description: 'Generate and track your 90-day plan with AI assistance. Transform your goals into actionable milestones with intelligent insights and progress tracking.',
    url: '/',
    siteName: 'MilestoneAI',
    images: [
      {
        url: '/milestoneAI.png',
        width: 1200,
        height: 630,
        alt: 'MilestoneAI Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MilestoneAI - AI-Powered 90-Day Planning',
    description: 'Generate and track your 90-day plan with AI assistance. Transform your goals into actionable milestones with intelligent insights and progress tracking.',
    images: ['/milestoneAI.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
            </div>
          }>
            <Providers>{children}</Providers>
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}


