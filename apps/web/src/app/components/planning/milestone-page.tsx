"use client";
import React from "react";
import { usePlan } from "../../contexts/plan-context";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import BackgroundGradients from "../BackgroundGradients";
import Calendar from "../../components/milestone/calendar";
import AIInsights from "../../components/milestone/ai-insights";
import QuickNotes from "../../components/milestone/quick-notes";

/**
 * @description
 * Main milestone page displaying plan data with calendar view, AI insights, and quick notes.
 * Replaces the previous MainContent layout with a redesigned interface.
 *
 * @receives data from:
 * - contexts/PlanContext.tsx; usePlan: Current plan data and state management
 *
 * @sends data to:
 * - components/milestone/calendar.tsx: Plan data for calendar display
 * - components/milestone/ai-insights.tsx: Plan data for progress analysis
 * - components/milestone/quick-notes.tsx: User notes management
 *
 * @sideEffects:
 * - Navigates to goal page if no plan exists
 * - Manages plan state through context
 */
export default function MilestonePage() {
  const {
    plan,
    streamingPlanText,
    streamingPlan,
    resetPlanState,
    selectedDuration,
  } = usePlan();
  const router = useRouter();

  // Redirect to goal page if no plan exists and no streaming is happening
  React.useEffect(() => {
    if (!plan && !streamingPlanText) {
      // Give it time for streaming to start, then redirect if nothing happens
      const timer = setTimeout(() => {
        router.push("/app");
      }, 3000); // 3 seconds to allow for navigation and streaming to start
      return () => clearTimeout(timer);
    }
  }, [plan, streamingPlanText, router]);

  const handleCreateNewPlan = () => {
    resetPlanState();
    router.push("/app");
  };

  return (
    <main
      className="relative h-screen overflow-y-auto"
      style={{ backgroundColor: "var(--bg-deep)" }}
    >
      <BackgroundGradients />
      {/* Navigation */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "transparent",
        }}
      >
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
          aria-label="Primary"
        >
          <div className="flex items-center space-x-4">
            <div
              className="text-lg font-semibold"
              style={{ color: "var(--text-inverse)" }}
            >
              MilestoneAI
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleCreateNewPlan}
              className="px-4 py-2 text-white rounded-lg font-medium shadow-md transition-colors motion-reduce:transition-none"
              style={{
                backgroundColor: "var(--black)",
                backgroundImage:
                  "var(--grad-cta), linear-gradient(var(--black), var(--black))",
                backgroundRepeat: "no-repeat, no-repeat",
                backgroundSize: "calc(100% - 12px) 1px, 100% 100%",
                backgroundPosition: "center 100%, 0 0",
                border: "none",
              }}
            >
              Create New Plan
            </button>

            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 py-8">
          {/* Page Title */}
          <div className="mb-8 text-center">
            <h1
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl mb-4"
              style={{ color: "var(--text-inverse)" }}
            >
              {plan
                ? `Goal: ${plan.goal}`
                : `Generating Your ${selectedDuration}-Day Plan`}
            </h1>
            <p
              className="max-w-2xl text-base sm:text-lg mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              {plan
                ? "Track your progress and stay on top of your milestones"
                : "Watch your personalized milestone plan come to life in real-time..."}
            </p>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar Section - Takes up 2 columns on large screens */}
            <div className="lg:col-span-2">
              <Calendar
                plan={plan as any}
                streamingText={streamingPlanText ?? undefined}
                streamingPlan={streamingPlan}
              />
            </div>

            {/* Sidebar with AI Insights and Quick Notes */}
            <div className="space-y-8">
              <AIInsights plan={plan || undefined} />
              <QuickNotes />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
