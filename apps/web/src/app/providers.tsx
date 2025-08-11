"use client";
import React, { useMemo } from 'react';
import { Toaster } from 'sonner';
import { PlanProvider } from './contexts/PlanContext';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

/**
 * @description
 * Client-side providers wrapper. Sets up optional Convex client and the
 * application-level `PlanProvider`, plus a global toast system.
 *
 * @receives data from:
 * - layout.tsx; RootLayout: Supplies `children` to be rendered within providers
 *
 * @sends data to:
 * - contexts/PlanContext.tsx; PlanProvider: Supplies plan state to the app
 * - convex backend (optional): Configures Convex context if `NEXT_PUBLIC_CONVEX_URL` is present
 * - sonner Toaster: Renders global toast portal
 *
 * @sideEffects:
 * - Initializes Clerk and (optionally) Convex clients for the lifetime of the app.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const convexClient = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    const finalUrl = url || (isProduction ? undefined : 'http://127.0.0.1:3210');
    /**
     * @description
     * In production, require `NEXT_PUBLIC_CONVEX_URL` to be set to avoid leaking
     * to a localhost fallback.
     *
     * @receives data from:
     * - providers.tsx; Providers: reads env and constructs client
     *
     * @sends data to:
     * - ConvexReactClient: initialized with endpoint URL
     *
     * @sideEffects:
     * - Throws in production when env is missing
     */
    if (!finalUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL must be set in production');
    }
    return new ConvexReactClient(finalUrl);
  }, []);

  const AppTree = (
    <PlanProvider>
      {children}
      <Toaster richColors position="bottom-right" />
    </PlanProvider>
  );

  return <ConvexProvider client={convexClient}>{AppTree}</ConvexProvider>;
}


