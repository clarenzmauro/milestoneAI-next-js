import type { Metadata } from 'next';
import { Suspense } from 'react';
import './index.css';
import Providers from './providers';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'MilestoneAI',
  description: 'Generate and track your 90-day plan with AI assistance.',
};

/**
 * @description
 * Root layout for the Next.js App Router. Sets up global HTML scaffolding and wraps
 * the application with shared providers (authentication, data, and app state).
 *
 * @receives data from:
 * - None: Framework entry point for all routes in `app/`.
 *
 * @sends data to:
 * - providers.tsx; Providers: Supplies Clerk, Convex (when configured), and Plan context
 * - All route segments as children
 *
 * @sideEffects:
 * - Initializes client-side providers and global styles for the entire app.
 */
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


