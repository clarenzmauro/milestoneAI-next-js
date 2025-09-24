import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import { generatePlan as apiGeneratePlan } from '../services/aiService';
import type { FullPlan } from '../types/planTypes';
import { parsePlanString } from '../utils/planParser';
import { checkAndUnlockAchievements } from '../services/achievementService';
import type { AchievementDefinition } from '../config/achievements';
import { useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@milestoneAI-next-js/backend/convex/_generated/api';
import { toast } from 'sonner';

// 1. Define the shape of the context data
export interface IPlanContext {
  plan: FullPlan | null;
  streamingPlanText: string | null;
  isLoading: boolean;
  error: string | null;
  selectedDuration: number | null;
  generateNewPlan: (goal: string, onChunk?: (chunk: string) => void) => Promise<void>;
  setPlanFromString: (planString: string, originalGoal: string | undefined) => Promise<boolean>;
  setPlan: (loadedPlan: FullPlan) => void;
  setSelectedDuration: (duration: number) => void;
  saveCurrentPlan: () => Promise<void>;
  toggleTaskCompletion: (monthIndex: number, weekIndex: number, taskDay: number) => Promise<void>;
  resetPlanState: () => void;
}

// 2. Create the Context
export const PlanContext = createContext<IPlanContext | undefined>(undefined);

// 3. Create the Provider Component
interface PlanProviderProps {
  children: ReactNode;
}

export const PlanProvider: React.FC<PlanProviderProps> = ({ children }) => {
  const [plan, setPlanState] = useState<FullPlan | null>(null);
  const [streamingPlanText, setStreamingPlanText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDuration, setSelectedDurationState] = useState<number | null>(null);
  const { user } = useUser();
  const savePlanMutation = useMutation(api.plans.savePlan);

  // Function to reset all relevant plan states
  /**
   * @description
   * Reset all plan-related UI and error/loading state to initial values.
   *
   * @receives data from:
   * - Sidebar.tsx; resetPlanState: User clicks "New Plan" or clears plan
   *
   * @sends data to:
   * - N/A
   *
   * @sideEffects:
   * - Mutates context state: plan, streamingPlanText, isLoading, error
   */
  const resetPlanState = () => {
    setPlanState(null);
    setStreamingPlanText(null);
    setIsLoading(false);
    setError(null);
  };

  /**
   * @description
   * Generate a new plan via AI and set state. Streams partial text to UI, parses final plan,
   * checks achievements, and persists to Convex when signed in.
   *
   * @receives data from:
   * - Sidebar.tsx; handlePlanGeneration: goal and optional onChunk callback
   *
   * @sends data to:
   * - services/aiService.ts; generatePlan: Requests streamed plan
   * - services/achievementService.ts; checkAndUnlockAchievements: Updates achievements
   * - Convex plans.savePlan: Persists the generated plan when user exists
   *
   * @sideEffects:
   * - Network calls to AI backend and Convex; mutates plan state
   */
  const generateNewPlan = async (goal: string, onChunk?: (chunk: string) => void) => {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setError('Goal cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlanState(null);
    setStreamingPlanText('');

    try {
      let accumulatedText = '';
      
      const rawPlanString = await apiGeneratePlan(trimmedGoal, selectedDuration || undefined, (chunk: string) => {
        accumulatedText += chunk;
        setStreamingPlanText(accumulatedText);
        
        // Also call the provided onChunk callback if it exists
        if (onChunk) {
          onChunk(chunk);
        }
      });
      
      // Clear streaming text once plan is fully generated
      setStreamingPlanText(null);
      
      const parsedPlan = parsePlanString(rawPlanString, trimmedGoal);

      if (parsedPlan) {
        // --- Check for initial achievements on plan generation ---
        const { updatedPlan: planWithInitialAchievements } = checkAndUnlockAchievements(parsedPlan);
        setPlanState(planWithInitialAchievements); // Set state with initial achievements unlocked
        // Note: We don't trigger toasts here, only on task completion later.

        // --- Auto-save if user is logged in ---
        if (user) {
          try {
            await savePlanMutation({ userId: user.id, plan: planWithInitialAchievements });
          } catch (saveError) {
            console.error('[PlanContext] Auto-save failed:', saveError);
          }
        }
        // --- End auto-save ---

      } else {
        console.error('Failed to parse the generated plan string. Raw string:', rawPlanString);
        setError('AI generated a plan, but it could not be structured correctly.');
        setPlanState(null);
      }

    } catch (err) {
      console.error('-----------------------------------------');
      console.error('Caught error during plan generation:');
      console.error('Error Object:', err);
      if (err instanceof Error) {
          console.error('Error Message:', err.message);
          console.error('Error Stack:', err.stack);
          setError(`Failed to generate plan: ${err.message}`);
      } else {
          setError('Failed to generate plan due to an unknown error.');
      }
      console.error('-----------------------------------------');
      setPlanState(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @description
   * Parse an AI-updated plan string and replace current plan; persists when signed in.
   *
   * @receives data from:
   * - Sidebar.tsx; handleChatOrRefinement: AI response string and original goal
   *
   * @sends data to:
   * - services/achievementService.ts; checkAndUnlockAchievements
   * - Convex plans.savePlan: Persists updated plan
   *
   * @sideEffects:
   * - Mutates plan state; network call to Convex when user exists
   */
  const setPlanFromString = async (planString: string, originalGoal: string | undefined): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
    try {
      const goalForParsing = plan?.goal || originalGoal || 'Updated Plan';
      const parsedPlan = parsePlanString(planString, goalForParsing);

      if (parsedPlan) {
        // --- Check for initial achievements on plan load from string ---
        const { updatedPlan: planWithInitialAchievements } = checkAndUnlockAchievements(parsedPlan);
        setPlanState(planWithInitialAchievements); // Set state with initial achievements unlocked
        // Note: We don't trigger toasts here.

        // --- Auto-save if user is logged in ---
        if (user) {
          try {
            await savePlanMutation({ userId: user.id, plan: planWithInitialAchievements });
          } catch (saveError) {
            console.error('[PlanContext] Updated plan auto-save failed:', saveError);
            // Log error, but don't interrupt user flow
          }
        }
        // --- End auto-save ---

        setIsLoading(false);
        return true;
      } else {
        console.error('[PlanContext] Failed to parse the updated plan string. String:', planString);
        setError('Received an AI response, but it could not be structured into an updated plan.');
        setIsLoading(false);
        return false;
      }
    } catch (parseError) {
        console.error('[PlanContext] Error during plan string parsing:', parseError);
        setError('An error occurred while trying to structure the updated plan.');
        setIsLoading(false);
        return false;
    }
  };

  /**
   * @description
   * Directly sets the plan state, e.g., when loading from Saved Plans.
   *
   * @receives data from:
   * - Sidebar.tsx; handleLoadPlan: FullPlan to set
   *
   * @sends data to:
   * - services/achievementService.ts; checkAndUnlockAchievements
   *
   * @sideEffects:
   * - Mutates plan state
   */
  const setPlan = (loadedPlan: FullPlan) => {
    // Ensure achievements are checked on load, but don't trigger toasts
    const { updatedPlan: planWithAchievements } = checkAndUnlockAchievements(loadedPlan);
    setPlanState(planWithAchievements);
    setError(null); // Clear any previous errors when setting a new plan
    setIsLoading(false); // Ensure loading is false
  };

  /**
   * @description
   * Persist the current plan to Convex when user exists.
   *
   * @receives data from:
   * - Sidebar.tsx; saveCurrentPlan action
   *
   * @sends data to:
   * - Convex plans.savePlan: Persists the plan document
   *
   * @sideEffects:
   * - Network call to Convex
   */
  const saveCurrentPlan = async () => {
    if (!user) {
      setError('You must be logged in to save.');
      return;
    }
    if (!plan) {
      return;
    }

    try {
      await savePlanMutation({ userId: user.id, plan });
    } catch (saveError) {
      console.error('[PlanContext] Failed to save current plan state:', saveError);
      setError('Failed to save the current plan progress.'); // Set an error for the user
    }
  };

  /**
   * @description
   * Toggle completion for a task and persist the updated plan (optimistic update).
   *
   * @receives data from:
   * - MainContent.tsx; handleTaskToggle: indices for month/week/day
   *
   * @sends data to:
   * - services/achievementService.ts; checkAndUnlockAchievements
   * - Convex plans.savePlan: Persists the plan after toggle
   *
   * @sideEffects:
   * - Mutates plan state; network call to Convex
   */
  const toggleTaskCompletion = async (monthIndex: number, weekIndex: number, taskDay: number) => {
    if (!plan) return; // No plan loaded

    const originalPlanState = plan; // Keep a reference to revert if save fails
    let planAfterToggle: FullPlan | null = null; // To hold state after local toggle
    let newlyUnlockedAchievements: AchievementDefinition[] = [];

    // --- 1. Optimistic UI Update & Achievement Check ---
    try {
      // Create a deep copy for local modification
      const tempUpdatedPlan = JSON.parse(JSON.stringify(originalPlanState)) as FullPlan;
      const task = tempUpdatedPlan.monthlyMilestones?.[monthIndex]?.weeklyObjectives?.[weekIndex]?.dailyTasks?.find(t => t.day === taskDay);

      if (task) {
        task.completed = !task.completed; // Toggle status

        // Only check achievements and show toasts when completing a task
        if (task.completed) {
          const achievementResult = checkAndUnlockAchievements(tempUpdatedPlan);
          planAfterToggle = achievementResult.updatedPlan; // Plan with potentially new achievements
          newlyUnlockedAchievements = achievementResult.newlyUnlocked;
        } else {
          // If un-completing, just use the plan with the toggled task
          planAfterToggle = tempUpdatedPlan;
        }

        setPlanState(planAfterToggle); // Update local state immediately

        // Trigger toasts *after* state update
        newlyUnlockedAchievements.forEach(ach => {
           toast.success(`Achievement Unlocked: ${ach.name}!`, {
             icon: '🏆', // Example: Use an emoji icon
             duration: 4000, // Show for 4 seconds
           });
        });

      } else {
        console.error(`[PlanContext] Task not found for toggling: Month ${monthIndex + 1}, Week ${weekIndex + 1}, Day ${taskDay}`);
        return; // Exit if task not found
      }
    } catch (error) {
      // Error during local update/check (e.g., JSON parsing)
      console.error('[PlanContext] Error during local task toggle/achievement check:', error);
      setError('An internal error occurred while updating the task.');
      setPlanState(originalPlanState); // Revert to original state
      return; // Exit if local update failed
    }


    // --- 2. Persist Change ---
    if (user && planAfterToggle) { // Ensure planAfterToggle is not null
      try {
          await savePlanMutation({ userId: user.id, plan: planAfterToggle });
          // Save successful, optimistic update is now confirmed
      } catch (saveError) {
          console.error('[PlanContext] Save after task toggle failed:', saveError);
          setError('Failed to save task update. Reverting change.');
          toast.error('Failed to save task update.');
          // Revert optimistic UI update on save failure
          setPlanState(originalPlanState); // Revert to the state before the toggle
      }
    } else if (!user) {
        // Optional: Give feedback that progress isn't saved?
        // toast.info('Log in to save your progress.');
    }
  };

  // Value object provided by the context
  const contextValue: IPlanContext = {
    plan,
    streamingPlanText,
    isLoading,
    error,
    selectedDuration,
    generateNewPlan,
    setPlanFromString,
    setPlan,
    setSelectedDuration: setSelectedDurationState,
    saveCurrentPlan,
    toggleTaskCompletion,
    resetPlanState,
  };

  return (
    <PlanContext.Provider value={contextValue}>
      {children}
    </PlanContext.Provider>
  );
};

// 4. Create a custom hook for easy consumption
export const usePlan = (): IPlanContext => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
