import Layout from './components/layout/Layout';

/**
 * @description
 * Default route for the application, rendering the main `Layout` which contains the
 * sidebar chat and plan visualization.
 *
 * @receives data from:
 * - None: Top-level page entry, receives providers via `app/layout.tsx`.
 *
 * @sends data to:
 * - components/layout/Layout.tsx; Layout: Renders the core application UI
 *
 * @sideEffects:
 * - None.
 */
export default function HomePage() {
  return <Layout />;
}


