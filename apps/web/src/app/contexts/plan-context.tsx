import React, { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import { generatePlan as apiGeneratePlan } from "../services/ai-service";
import type { FullPlan } from "../types/planTypes";
import { parsePlanString } from "../utils/planParser";
import { useUser } from "@clerk/nextjs";
import { useMutation, useAction } from "convex/react";
import { api } from "@milestoneAI-next-js/backend/convex/_generated/api";
import type { Id } from "@milestoneAI-next-js/backend/convex/_generated/dataModel";
import { toast } from "sonner";

export interface IPlanContext {
  plan: FullPlan | null;
  streamingPlanText: string | null;
  streamingPlan: FullPlan | null;
  isLoading: boolean;
  error: string | null;
  selectedDuration: number | null;
  goal: string | null;
  currentPlanId: Id<"plans"> | null;
  generateNewPlan: (
    goal: string,
    onChunk?: (chunk: string) => void
  ) => Promise<void>;
  setPlanFromString: (
    planString: string,
    originalGoal: string | undefined
  ) => Promise<boolean>;
  setPlan: (loadedPlan: FullPlan) => void;
  setSelectedDuration: (duration: number) => void;
  setGoal: (goal: string) => void;
  setCurrentPlanId: (id: Id<"plans"> | null) => void;
  saveCurrentPlan: () => Promise<void>;
  toggleTaskCompletion: (
    monthIndex: number,
    weekIndex: number,
    taskDay: number
  ) => Promise<void>;
  resetPlanState: () => void;
}

export const PlanContext = createContext<IPlanContext | undefined>(undefined);

interface PlanProviderProps {
  children: ReactNode;
}

export const PlanProvider: React.FC<PlanProviderProps> = ({ children }) => {
  const [plan, setPlanState] = useState<FullPlan | null>(null);
  const [streamingPlanText, setStreamingPlanText] = useState<string | null>(
    null
  );
  const [streamingPlan, setStreamingPlan] = useState<FullPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDuration, setSelectedDurationState] = useState<number | null>(
    null
  );
  const [goal, setGoalState] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanIdState] = useState<Id<"plans"> | null>(
    null
  );
  const { user } = useUser();
  const savePlanMutation = useMutation(api.plans.savePlan);
  const generateInsights = useAction(api.insights.recomputeInsightsForPlan);

  const setGoal = (newGoal: string) => {
    setGoalState(newGoal);
  };

  const resetPlanState = () => {
    setPlanState(null);
    setStreamingPlanText(null);
    setStreamingPlan(null);
    setIsLoading(false);
    setError(null);
    setGoalState(null);
    setCurrentPlanIdState(null);
  };

  const generateNewPlan = async (
    goal: string,
    onChunk?: (chunk: string) => void
  ) => {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setError("Goal cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlanState(null);
    setStreamingPlanText("");

    try {
      let accumulatedText = "";

      const rawPlanString = await apiGeneratePlan(
        trimmedGoal,
        selectedDuration || undefined,
        (chunk: string) => {
          accumulatedText += chunk;
          setStreamingPlanText(accumulatedText);

          try {
            const parsedStreamingPlan = parsePlanString(
              accumulatedText,
              trimmedGoal,
              selectedDuration || undefined,
              true
            );
            if (parsedStreamingPlan) {
              setStreamingPlan(parsedStreamingPlan);
            }
          } catch (parseError) {
            console.debug("Streaming parse failed:", parseError);
          }

          if (onChunk) {
            onChunk(chunk);
          }
        }
      );

      setStreamingPlanText(null);
      setStreamingPlan(null);

      const parsedPlan = parsePlanString(
        rawPlanString,
        trimmedGoal,
        selectedDuration || undefined
      );

      if (parsedPlan) {
        let totalTasks = 0;
        parsedPlan.monthlyMilestones.forEach((month) => {
          month.weeklyObjectives.forEach((week) => {
            totalTasks += week.dailyTasks.length;
          });
        });

        if (selectedDuration && totalTasks !== selectedDuration) {
          console.warn(
            `Final validation: Task count mismatch: got ${totalTasks}, expected ${selectedDuration}`
          );
          if (totalTasks < selectedDuration * 0.7) {
            setError(
              `Plan generation incomplete. Expected ${selectedDuration} tasks but got only ${totalTasks} unique tasks. Please try again.`
            );
            setPlanState(null);
            return;
          }
          console.log(
            `Proceeding with ${totalTasks} unique tasks out of ${selectedDuration} expected`
          );
        }

        setPlanState(parsedPlan);

        if (user) {
          try {
            const insertedId = await savePlanMutation({
              userId: user.id,
              plan: parsedPlan,
            });
            if (insertedId) {
              setCurrentPlanIdState(insertedId as Id<"plans">);
              // Automatically generate insights for the new plan
              // Add a small delay to ensure plan is fully committed
              setTimeout(async () => {
                try {
                  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  await generateInsights({
                    planId: insertedId as Id<"plans">,
                    userTimezone
                  });
                } catch (insightsError) {
                  console.error("[PlanContext] Auto-insights generation failed:", insightsError);
                  // Don't show error to user - insights are optional enhancement
                }
              }, 100); // 100ms delay
            }
          } catch (saveError) {
            console.error("[PlanContext] Auto-save failed:", saveError);
          }
        }
      } else {
        console.error(
          "Failed to parse the generated plan string. Raw string:",
          rawPlanString
        );
        setError(
          "AI generated a plan, but it could not be structured correctly."
        );
        setPlanState(null);
      }
    } catch (err) {
      console.error("-----------------------------------------");
      console.error("Caught error during plan generation:");
      console.error("Error Object:", err);
      if (err instanceof Error) {
        console.error("Error Message:", err.message);
        console.error("Error Stack:", err.stack);
        setError(`Failed to generate plan: ${err.message}`);
      } else {
        setError("Failed to generate plan due to an unknown error.");
      }
      console.error("-----------------------------------------");
      setPlanState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setPlanFromString = async (
    planString: string,
    originalGoal: string | undefined
  ): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const goalForParsing = plan?.goal || originalGoal || "Updated Plan";
      const parsedPlan = parsePlanString(planString, goalForParsing);

      if (parsedPlan) {
        setPlanState(parsedPlan);

        if (user) {
          try {
            const insertedId = await savePlanMutation({
              userId: user.id,
              plan: parsedPlan,
            });
            if (!currentPlanId && insertedId)
              setCurrentPlanIdState(insertedId as Id<"plans">);
          } catch (saveError) {
            console.error(
              "[PlanContext] Updated plan auto-save failed:",
              saveError
            );
          }
        }

        setIsLoading(false);
        return true;
      } else {
        console.error(
          "[PlanContext] Failed to parse the updated plan string. String:",
          planString
        );
        setError(
          "Received an AI response, but it could not be structured into an updated plan."
        );
        setIsLoading(false);
        return false;
      }
    } catch (parseError) {
      console.error(
        "[PlanContext] Error during plan string parsing:",
        parseError
      );
      setError("An error occurred while trying to structure the updated plan.");
      setIsLoading(false);
      return false;
    }
  };

  const setPlan = (loadedPlan: FullPlan) => {
    setPlanState(loadedPlan);
    setError(null);
    setIsLoading(false);
  };

  const saveCurrentPlan = async () => {
    if (!user) {
      setError("You must be logged in to save.");
      return;
    }
    if (!plan) {
      return;
    }

    try {
      const insertedId = await savePlanMutation({ userId: user.id, plan });
      if (!currentPlanId && insertedId)
        setCurrentPlanIdState(insertedId as Id<"plans">);
    } catch (saveError) {
      console.error(
        "[PlanContext] Failed to save current plan state:",
        saveError
      );
      setError("Failed to save the current plan progress.");
    }
  };

  const toggleTaskCompletion = async (
    monthIndex: number,
    weekIndex: number,
    taskDay: number
  ) => {
    if (!plan) return;

    const originalPlanState = plan;
    let planAfterToggle: FullPlan | null = null;

    try {
      const tempUpdatedPlan = JSON.parse(
        JSON.stringify(originalPlanState)
      ) as FullPlan;
      const task = tempUpdatedPlan.monthlyMilestones?.[
        monthIndex
      ]?.weeklyObjectives?.[weekIndex]?.dailyTasks?.find(
        (t) => t.day === taskDay
      );

      if (task) {
        task.completed = !task.completed;
        planAfterToggle = tempUpdatedPlan;

        setPlanState(planAfterToggle);
      } else {
        console.error(
          `[PlanContext] Task not found for toggling: Month ${monthIndex + 1}, Week ${weekIndex + 1}, Day ${taskDay}`
        );
        return;
      }
    } catch (error) {
      console.error("[PlanContext] Error during local task toggle:", error);
      setError("An internal error occurred while updating the task.");
      setPlanState(originalPlanState);
      return;
    }

    if (user && planAfterToggle) {
      try {
        await savePlanMutation({ userId: user.id, plan: planAfterToggle });
        // Regenerate insights after task completion to provide updated guidance
        setTimeout(async () => {
          try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await generateInsights({
              planId: currentPlanId!,
              userTimezone
            });
          } catch (insightsError) {
            console.error("[PlanContext] Insights regeneration failed:", insightsError);
            // Don't show error - insights are optional enhancement
          }
        }, 100); // 100ms delay
      } catch (saveError) {
        console.error(
          "[PlanContext] Save after task toggle failed:",
          saveError
        );
        setError("Failed to save task update. Reverting change.");
        toast.error("Failed to save task update.");
        setPlanState(originalPlanState);
      }
    }
  };

  const contextValue: IPlanContext = {
    plan,
    streamingPlanText,
    streamingPlan,
    isLoading,
    error,
    selectedDuration,
    goal,
    currentPlanId,
    generateNewPlan,
    setPlanFromString,
    setPlan,
    setSelectedDuration: setSelectedDurationState,
    setGoal,
    setCurrentPlanId: setCurrentPlanIdState,
    saveCurrentPlan,
    toggleTaskCompletion,
    resetPlanState,
  };

  return (
    <PlanContext.Provider value={contextValue}>{children}</PlanContext.Provider>
  );
};

export const usePlan = (): IPlanContext => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
};
