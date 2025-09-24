"use client";
import React from 'react';
import { usePlan } from '../contexts/PlanContext';
import PlanningPage from '../components/planning/planning-page';
import Layout from '../components/layout/Layout';

export default function AppPage() {
  const { selectedDuration } = usePlan();

  // If no duration is selected, show the planning page
  // If duration is selected, show the main app layout
  return selectedDuration ? <Layout /> : <PlanningPage />;
}
