"use client";
import React, { Suspense } from "react";
import { usePlan } from "../contexts/plan-context";
import PlanningPage from "../components/planning/planning-page";
import GoalPage from "../components/planning/goal-page";
import MilestonePage from "../components/planning/milestone-page";

function AppContent() {
  const { selectedDuration, goal } = usePlan();

  // If no duration is selected, show the planning page first
  // If duration is selected but no goal is set, show the goal page
  // If both duration and goal are set, show the milestone page
  if (!selectedDuration) {
    return <PlanningPage />;
  }
  if (!goal) {
    return <GoalPage />;
  }
  return <MilestonePage />;
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
