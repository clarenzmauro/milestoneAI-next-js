// src/components/modals/SavedPlansModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
// Tailwind classes inlined; CSS module removed
import type { FullPlan } from '../../types/planTypes';
import type { ChatMessage } from '../../types/chatTypes';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@milestoneAI-next-js/backend/convex/_generated/api';

interface SavedPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPlan: (loadedData: { plan: FullPlan; chatHistory?: ChatMessage[] }) => void;
}

// Helper to format ISO string timestamp
const formatTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp) return 'Unknown date';
  try {
    return new Date(timestamp).toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    });
  } catch (e) {
    return 'Invalid date';
  }
};

const SavedPlansModal: React.FC<SavedPlansModalProps> = ({ isOpen, onClose, onLoadPlan }) => {
  const { user } = useUser();
  const plans = useQuery(api.plans.listPlans, user ? { userId: user.id } : 'skip');
  const [rawPlans, setRawPlans] = useState<any[]>([]); // Convex docs
  const [groupedPlans, setGroupedPlans] = useState<Map<string, any[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null); // Track which plan is being deleted
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      if (!plans) return; // still loading
      setRawPlans(plans as any[]);
    } catch (err) {
      setError('Failed to load saved plans.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setDeletingId(null);
    }
  }, [user, plans]);

  // Fetch plans when the modal opens and the user is available
  useEffect(() => {
    if (isOpen && user) {
      fetchPlans();
    }
  }, [isOpen, user, fetchPlans]);

  // Group plans whenever rawPlans changes
  useEffect(() => {
    const newGroupedPlans = new Map<string, any[]>();
    rawPlans.forEach((plan: any) => { // Ensure type safety here
      const goalKey = plan.goal || 'Untitled Plan';
      const existing = newGroupedPlans.get(goalKey) || [];
      newGroupedPlans.set(goalKey, [...existing, plan]);
    });
    setGroupedPlans(newGroupedPlans);
    // Reset expansion state when plans are refetched/regrouped
    setExpandedGoals({});
  }, [rawPlans]);

  // Function to toggle expansion state for a goal
  const toggleGoalExpansion = (goal: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goal]: !prev[goal] // Toggle the boolean value
    }));
  };

  const handleLoadPlan = (version: any) => {
    // Pass the core plan data along with history
    onLoadPlan({
      plan: version as FullPlan, 
      chatHistory: version.chatHistory
    });
    onClose(); // Close modal after loading
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    setDeletingId(planId); // Indicate deletion in progress
    try {
      // Use mutation directly when we add it; for now, refetch will pick up changes elsewhere
      // Refetch plans to update the list after deletion
      fetchPlans(); 
    } catch (err) {
      setError('Failed to delete plan.');
      console.error(err);
    } finally {
      setDeletingId(null); // Clear deletion indicator
    }
  };

  const handleDeleteGoalGroup = async (goalToDelete: string) => {
    if (!user || deletingGoal) return; // Prevent double clicks or actions while deleting

    const confirmation = window.confirm(
      `Are you sure you want to delete all saved versions for the goal "${goalToDelete}"? This action cannot be undone.`
    );

    if (confirmation) {
      setDeletingGoal(goalToDelete); // Set deleting state for UI feedback
      setError(null);
      try {
        // Use mutation directly when we add it; for now, refetch will pick up changes elsewhere
        // Refresh the list after successful deletion
        await fetchPlans(); 
      } catch (err) { 
        console.error("Error batch deleting plans:", err);
        setError(`Failed to delete plans for goal: ${goalToDelete}`);
      } finally {
        setDeletingGoal(null); // Clear deleting state regardless of outcome
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Saved Plans</h2>
          <button onClick={onClose} className="text-2xl leading-none">&times;</button>
        </div>

        {isLoading && <div className="text-sm text-[var(--text-secondary)]">Loading plans...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        
        {!isLoading && !error && groupedPlans.size === 0 && (
          <div className="text-sm text-[var(--text-secondary)]">No saved plans found.</div>
        )}

        {!isLoading && !error && groupedPlans.size > 0 && (
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {Array.from(groupedPlans.entries()).map(([goal, versions]) => {
              const isExpanded = expandedGoals[goal] ?? false;
              return (
                <div key={goal} className="border border-[var(--border-color,#E5E9ED)] rounded-md">
                  <div className="flex items-center justify-between p-3 cursor-pointer bg-[var(--background-hover-light,#f8f8f8)]" onClick={() => !deletingGoal && toggleGoalExpansion(goal)}>
                    <h3 className="font-medium m-0">{goal}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        aria-label={`Delete all versions for goal ${goal}`}
                        className="text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDeleteGoalGroup(goal); }}
                        disabled={deletingGoal === goal || !!deletingId}
                        title="Delete all versions"
                      >
                        {deletingGoal === goal ? 'Deleting...' : '🗑️'}
                      </button>
                      <button
                        aria-label={isExpanded ? 'Collapse versions' : 'Expand versions'}
                        aria-expanded={isExpanded}
                        onClick={(e) => { e.stopPropagation(); toggleGoalExpansion(goal); }}
                        disabled={deletingGoal === goal}
                      >
                        {isExpanded ? '−' : '+'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <ul className="divide-y">
                      {versions
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .map((version: any) => (
                          <li key={version.id} className="flex items-center justify-between p-3">
                            <div>
                              <span className="text-sm">Saved: {formatTimestamp(version.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLoadPlan(version)}
                                className="px-3 py-1.5 rounded text-[13px] font-medium bg-[#4A90E2] text-white disabled:opacity-50"
                                disabled={deletingId === version.id || deletingGoal === goal}
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeletePlan(version.id)}
                                className="px-3 py-1.5 rounded text-[13px] font-medium bg-red-600 text-white disabled:opacity-50"
                                disabled={deletingId === version.id || deletingGoal === goal}
                              >
                                {deletingId === version.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPlansModal;
