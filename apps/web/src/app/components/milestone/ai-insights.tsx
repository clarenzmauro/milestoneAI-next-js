import React from 'react';
import type { FullPlan } from '../../types/planTypes';
import { FaLightbulb } from 'react-icons/fa';
import { useAction, useQuery } from 'convex/react';
import { api } from '@milestoneAI-next-js/backend/convex/_generated/api';

interface AIInsightsProps {
  plan?: FullPlan;
}

/**
 * @description
 * AI Insights component that fetches and displays server-generated insights from Convex.
 * This is the single source of truth for insights.
 */
const AIInsights: React.FC<AIInsightsProps> = ({ plan }) => {
  const insightsPage = useQuery(api.insights.listInsights, plan ? { planId: (plan as any)._id } : { });
  const recompute = useAction(api.insights.recomputeInsightsForPlan);

  const onRecompute = async () => {
    if (!plan) return;
    try {
      await recompute({ planId: (plan as any)._id });
    } catch (e) {
      console.error('Failed to recompute insights', e);
    }
  };

  // Placeholder when no plan yet
  if (!plan) {
    return (
      <article className="group relative overflow-hidden rounded-lg border transition-shadow motion-reduce:transition-none" style={{
        background: 'radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)',
        borderColor: 'var(--border-subtle)',
      }}>
        <div className="p-6 border-b border-[var(--border-color,#E5E9ED)]">
          <div className="flex items-center space-x-2">
            <FaLightbulb className="text-[var(--accent-cyan,#22D3EE)]" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>
              AI Insights
            </h2>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Insights will appear once your plan is generated
          </p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <FaLightbulb className="text-4xl text-[var(--accent-cyan,#22D3EE)] opacity-50 mx-auto mb-4" />
            <p className="text-sm text-[var(--text-muted)]">
              AI insights will be shown here after your plan is created.
            </p>
          </div>
        </div>
      </article>
    );
  }

  const insights = insightsPage?.page ?? [];

  return (
    <article className="group relative overflow-hidden rounded-lg border transition-shadow motion-reduce:transition-none" style={{
      background: 'radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)',
      borderColor: 'var(--border-subtle)',
    }}>
      <div className="p-6 border-b border-[var(--border-color,#E5E9ED)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaLightbulb className="text-[var(--accent-cyan,#22D3EE)]" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>
              AI Insights
            </h2>
          </div>
          <button
            onClick={onRecompute}
            className="px-3 py-2 text-white rounded-lg text-sm font-medium shadow-md"
            style={{
              backgroundColor: 'var(--black)',
              backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
              backgroundRepeat: 'no-repeat, no-repeat',
              backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
              backgroundPosition: 'center 100%, 0 0',
              border: 'none',
            }}
          >
            Regenerate
          </button>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Server-generated insights based on your plan and recent activity
        </p>
      </div>

      <div className="p-6">
        {insights.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">No insights yet.</div>
        ) : (
          <ul className="space-y-3">
            {insights.map((ins: any) => (
              <li key={ins._id as string} className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-deep)]">
                <div className="text-sm text-[var(--text-inverse)]">{ins.text}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">{ins.kind}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
};

export default AIInsights;
