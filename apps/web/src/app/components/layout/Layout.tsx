"use client";
import React from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

/**
 * @description
 * Top-level page layout that arranges the application UI into a persistent sidebar and a
 * main content area. This component is a Client Component so that its children can use
 * React hooks freely within the Next.js App Router.
 *
 * @receives data from:
 * - None: Receives no props; relies on context/providers set up in `app/layout.tsx`.
 *
 * @sends data to:
 * - Sidebar.tsx; Sidebar: Renders the chat and controls area
 * - MainContent.tsx; MainContent: Renders the plan visualization and progress UI
 *
 * @sideEffects:
 * - None directly; relies on providers higher in the tree (e.g., PlanProvider, ClerkProvider).
 */
const Layout: React.FC = () => {
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[var(--layout-background)]">
      <Sidebar />
      <MainContent />
    </div>
  );
};

export default Layout;
