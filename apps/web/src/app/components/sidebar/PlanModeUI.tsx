import React, { useState } from 'react';
// Tailwind classes inlined; CSS module removed
import { usePlan } from '../../contexts/PlanContext';
import { useUser } from '@clerk/nextjs';
import { ConvexReactClient } from 'convex/react';
import { ConvexPlanService } from '../../services/convexPlanService';

const PlanModeUI: React.FC = () => {
  const { plan, isLoading: isPlanLoading, error: planError } = usePlan();
  const { user } = useUser();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;
  const planService = convexClient ? new ConvexPlanService(convexClient) : null;
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<boolean>(false);

  const handleSave = async () => {
    if (!user || !plan) return;

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);
    try {
      if (!planService) throw new Error('Convex not configured');
      const planId = await planService.savePlan(user.id, plan);
      setSaveMessage(`Plan saved successfully (ID: ${planId.substring(0, 6)}...)`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save plan:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save plan.';
      setSaveMessage(`Error: ${errorMessage}`);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (isPlanLoading) {
    return <div className="text-sm text-[var(--text-secondary)]">Generating plan...</div>;
  }

  if (planError) {
    return <div className="text-sm text-red-600">Error loading plan: {planError}</div>;
  }

  if (!plan) {
    return <div className="text-sm text-[var(--text-secondary)]">No plan active. Define your goal in the input below.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!user || !plan || isSaving}
          className="px-4 py-1.5 rounded text-[13px] font-medium bg-[#4A90E2] text-white disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Plan'}
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveError ? 'text-red-600' : 'text-green-600'}`}>{saveMessage}</span>
        )}
      </div>

      <div>
        <h3 className="font-semibold">Current Goal:</h3>
        <p className="text-sm">{plan.goal}</p>
      </div>
    </div>
  );
};

export default PlanModeUI;
