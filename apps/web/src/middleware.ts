import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * @description
 * Clerk middleware enabling authentication and route protection. Applies to all
 * application routes and API endpoints except Next.js internals and static assets.
 *
 * @receives data from:
 * - layout.tsx; RootLayout: Uses ClerkProvider which relies on this middleware context
 *
 * @sends data to:
 * - Next.js request pipeline: Attaches Clerk auth context to requests
 *
 * @sideEffects:
 * - Intercepts matching routes to evaluate authentication state.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};


