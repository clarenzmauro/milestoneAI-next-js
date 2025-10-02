"use client";
import { useState, lazy, Suspense } from "react";
import Image from "next/image";
import { usePlan } from "../../contexts/plan-context";
import BackgroundGradients from "../background-gradients";
import { timelineOptions } from "../../config/timeline-options";
import { useQuery } from "convex/react";
import { api } from "@milestoneAI-next-js/backend/convex/_generated/api";
import { useUser, UserButton } from "@clerk/nextjs";

// Lazy load modal components
const CustomDurationModal = lazy(() => import("../modals/custom-duration-modal"));
const SavedPlansModal = lazy(() => import("../modals/saved-plans-modal"));

const getCardStyles = (isSelected: boolean) => ({
  background: isSelected
    ? "radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.35), rgba(0,0,0,0) 70%), var(--surface-card)"
    : "radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)",
  borderColor: isSelected
    ? "var(--color-border,#E5E9ED)"
    : "var(--border-subtle)",
  boxShadow: isSelected
    ? "var(--grad-cta), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
    : undefined,
});

export default function PlanningPage() {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<
    number | "custom" | null
  >(null);
  const { setSelectedDuration, setPlan, setCurrentPlanId, setGoal } = usePlan();
  const { user, isLoaded } = useUser();

  // Check if user has existing plans
  const userPlans = useQuery(
    api.plans.listPlans,
    user?.id ? { userId: user.id } : "skip"
  );
  const hasExistingPlans = userPlans && userPlans.length > 0;

  const handleTimelineSelect = (duration: number | "custom") => {
    if (duration === "custom") {
      setIsCustomModalOpen(true);
    } else {
      setSelectedTimeline(duration);
    }
  };

  const handleCustomDurationConfirm = (days: number) => {
    setSelectedTimeline(days);
    setIsCustomModalOpen(false);
  };

  const handleSelectSavedPlan = (plan: any) => {
    // Calculate the total duration from the plan structure
    const totalDays = plan.monthlyMilestones?.reduce((total: number, month: any) => {
      return total + month.weeklyObjectives?.reduce((monthTotal: number, week: any) => {
        return monthTotal + (week.dailyTasks?.length || 0);
      }, 0) || 0;
    }, 0) || 0;

    setPlan(plan);
    setGoal(plan.goal);
    setSelectedDuration(totalDays);
    setCurrentPlanId(plan._id);
    // The conditional rendering in app/page.tsx will handle showing the milestone page
  };

  const handleContinue = () => {
    if (selectedTimeline && selectedTimeline !== "custom") {
      setSelectedDuration(selectedTimeline);
      // The conditional rendering in app/page.tsx will handle showing the main app
    }
  };

  return (
    <main
      className="relative overflow-hidden h-screen"
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
          <div
            className="text-lg font-semibold"
            style={{ color: "var(--text-inverse)" }}
          >
            MilestoneAI
          </div>

          <div className="flex items-center space-x-4">
            {hasExistingPlans && (
              <button
                onClick={() => setIsPlansModalOpen(true)}
                className="inline-flex items-center rounded-full px-6 py-1.5 text-sm font-medium text-white shadow-md transition-colors motion-reduce:transition-none"
                style={{
                  backgroundColor: 'var(--black)',
                  backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
                  backgroundRepeat: 'no-repeat, no-repeat',
                  backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
                  backgroundPosition: 'center 100%, 0 0',
                  border: 'none',
                }}
                title="View your saved plans"
              >
                View Your Plans
              </button>
            )}

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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 py-12 text-center">
          <h1
            className="text-balance text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ color: "var(--text-inverse)" }}
          >
            Choose Your Planning Timeline
          </h1>
          <p
            className="mt-4 max-w-2xl text-base sm:text-lg mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Set the duration that works best for you, and let MilestoneAI create
            your roadmap.
          </p>
        </div>
      </section>

      {/* Timeline Cards Section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {timelineOptions.map((timeline) => {
            const isSelected = selectedTimeline === timeline.duration;
            return (
              <article
                key={timeline.title}
                className={`group relative overflow-hidden rounded-lg border p-6 text-center transition-all motion-reduce:transition-none cursor-pointer hover:shadow-lg ${
                  isSelected ? "shadow-lg" : ""
                }`}
                style={getCardStyles(isSelected)}
                onClick={() => handleTimelineSelect(timeline.duration)}
              >
                <div className="relative mx-auto mb-6 h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32">
                  <Image
                    src={timeline.imageSrc}
                    alt={timeline.imageAlt}
                    width={128}
                    height={128}
                    className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32"
                    priority
                  />
                </div>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-inverse)" }}
                >
                  {timeline.title}
                </h3>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {timeline.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Continue Button */}
      <section className="mx-auto max-w-7xl px-6 py-8 text-center">
        <button
          onClick={handleContinue}
          disabled={!selectedTimeline}
          className="inline-flex items-center rounded-full px-6 py-1.5 text-sm font-medium text-white shadow-md transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
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
          Continue
        </button>
      </section>

      <Suspense fallback={null}>
        <CustomDurationModal
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
          onConfirm={handleCustomDurationConfirm}
        />
      </Suspense>

      <Suspense fallback={null}>
        <SavedPlansModal
          isOpen={isPlansModalOpen}
          onClose={() => setIsPlansModalOpen(false)}
          onSelectPlan={handleSelectSavedPlan}
        />
      </Suspense>
    </main>
  );
}
