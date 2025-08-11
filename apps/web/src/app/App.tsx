import Layout from './components/layout/Layout'; 
import { PlanProvider } from './contexts/PlanContext'; 
import { Toaster } from 'sonner';

/**
 * @description
 * Legacy CRA-style App wrapper retained temporarily; Next.js app uses `app/layout.tsx` instead.
 *
 * @receives data from:
 * - None
 *
 * @sends data to:
 * - components/layout/Layout.tsx; Layout: Renders main UI
 *
 * @sideEffects:
 * - Renders global Toaster portal (sonner)
 */
function App() {
  return (
    <PlanProvider>
      <Layout />
      <Toaster richColors position="bottom-right" />
    </PlanProvider>
  );
}

export default App;
