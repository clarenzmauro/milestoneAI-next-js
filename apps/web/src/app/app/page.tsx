"use client";
import React from 'react';
import { usePlan } from '../contexts/PlanContext';
import PlanningPage from '../components/planning/planning-page';
import GoalPage from '../components/planning/goal-page';
import Layout from '../components/layout/Layout';

export default function AppPage() {
  const { selectedDuration, goal } = usePlan();

  // If no duration is selected, show the planning page first
  // If duration is selected but no goal is set, show the goal page
  // If both duration and goal are set, show the main app layout
  if (!selectedDuration) {
    return <PlanningPage />;
  }
  if (!goal) {
    return <GoalPage />;
  }
  return <Layout />;
}
