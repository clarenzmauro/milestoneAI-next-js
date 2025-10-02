import React, { useState } from "react";
import { FaTimes, FaCalendarAlt, FaPlay, FaTrash } from "react-icons/fa";
import { useQuery, useMutation } from "convex/react";
import { api } from "@milestoneAI-next-js/backend/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import type { FullPlan } from "../../types/plan-types";

interface SavedPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: any) => void;
}

export default function SavedPlansModal({
  isOpen,
  onClose,
  onSelectPlan,
}: SavedPlansModalProps) {
  const { user, isLoaded } = useUser();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = useQuery(api.plans.listPlans, { userId: user?.id || "" });
  const deletePlan = useMutation(api.plans.deletePlan);

  const handleDeletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this plan?")) {
      try {
        await deletePlan({ id: planId as any, userId: user?.id || "" });
      } catch (error) {
        console.error("Failed to delete plan:", error);
        alert("Failed to delete plan. Please try again.");
      }
    }
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlanId(plan._id);
    onSelectPlan(plan);
    onClose();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[80vh] relative overflow-hidden rounded-2xl border border-[var(--accent-cyan)] bg-[var(--neutral-950)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaCalendarAlt className="text-[var(--accent-cyan)] text-xl" />
              <h2 className="text-xl font-semibold text-[var(--text-inverse)]">
                Your Saved Plans
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full hover:bg-[var(--bg-deep)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:ring-offset-0"
            >
              <FaTimes className="text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {!isLoaded ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-4"></div>
              <p className="text-sm text-[var(--text-secondary)]">Loading plans...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-12">
              <FaCalendarAlt className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                Please sign in to view your plans
              </p>
            </div>
          ) : !plans ? (
            <div className="text-center py-12">
              <FaCalendarAlt className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                Loading plans...
              </p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <FaCalendarAlt className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                No saved plans yet. Create your first plan to get started!
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto grid gap-4">
              {plans.map((plan) => (
                <article
                  key={plan._id}
                  className="group relative overflow-hidden rounded-lg border border-[var(--border-subtle)] p-6 bg-[var(--bg-deep)] hover:border-[var(--accent-cyan)] transition-colors cursor-pointer"
                  onClick={() => handleSelectPlan(plan)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-[var(--text-inverse)] mb-2">
                        {plan.goal}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-[var(--text-secondary)]">
                        <span>Created {formatDate(plan.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => handleDeletePlan(plan._id, e)}
                        className="p-2 rounded-full hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                        title="Delete plan"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                      <button
                        className="inline-flex items-center rounded-full px-6 py-1.5 text-sm font-medium text-white shadow-md transition-colors motion-reduce:transition-none"
                        style={{
                          backgroundColor: 'var(--black)',
                          backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
                          backgroundRepeat: 'no-repeat, no-repeat',
                          backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
                          backgroundPosition: 'center 100%, 0 0',
                          border: 'none',
                        }}
                        title="Load plan"
                      >
                        <FaPlay className="text-sm mr-2" />
                        <span>Load</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}