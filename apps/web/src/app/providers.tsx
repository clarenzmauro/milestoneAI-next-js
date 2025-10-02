"use client";
import React, { useMemo } from "react";
import { Toaster } from "sonner";
import { PlanProvider } from "./contexts/plan-context";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

/**
 * @description
 * Client-side providers wrapper. Sets up Convex client integrated with Clerk auth
 * and the application-level `PlanProvider`, plus a global toast system.
 *
 * @receives data from:
 * - layout.tsx; RootLayout: Supplies `children` to be rendered within providers
 *
 * @sends data to:
 * - contexts/PlanContext.tsx; PlanProvider: Supplies plan state to the app
 * - convex backend: Configures Convex context with Clerk auth forwarding
 * - sonner Toaster: Renders global toast portal
 *
 * @sideEffects:
 * - Initializes Convex with Clerk so server functions receive user identity.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const convexClient = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    const isProduction = process.env.NODE_ENV === "production";
    const finalUrl =
      url || (isProduction ? undefined : "http://127.0.0.1:3210");
    if (!finalUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL must be set in production");
    }

    return new ConvexReactClient(finalUrl);
  }, []);

  const AppTree = (
    <PlanProvider>
      {children}
      <Toaster richColors position="bottom-right" />
    </PlanProvider>
  );

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      {AppTree}
    </ConvexProviderWithClerk>
  );
}
