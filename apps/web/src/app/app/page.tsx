"use client";
import { Suspense, lazy } from "react";
import { usePlan } from "../contexts/plan-context";

// Lazy load page components for route-based code splitting
const PlanningPage = lazy(() => import("../components/planning/planning-page"));
const GoalPage = lazy(() => import("../components/planning/goal-page"));
const MilestonePage = lazy(() => import("../components/planning/milestone-page"));

function AppContent() {
  const { selectedDuration, goal } = usePlan();

  // If no duration is selected, show the planning page first
  // If duration is selected but no goal is set, show the goal page
  // If both duration and goal are set, show the milestone page
  if (!selectedDuration) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
        </div>
      }>
        <PlanningPage />
      </Suspense>
    );
  }
  if (!goal) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
        </div>
      }>
        <GoalPage />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    }>
      <MilestonePage />
    </Suspense>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    }>
      <AppContent />
    </Suspense>
  );
}
