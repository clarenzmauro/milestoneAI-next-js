import React from 'react';
import type { FullPlan } from '../../types/plan-types';
import { FaLightbulb } from 'react-icons/fa';
import { useQuery } from 'convex/react';
import { api } from '@milestoneAI-next-js/backend/convex/_generated/api';
import type { Id } from '@milestoneAI-next-js/backend/convex/_generated/dataModel';

interface AIInsightsProps {
  plan?: FullPlan;
  planId?: Id<"plans">;
}

/**
 * @description
 * AI Insights component that fetches and displays server-generated insights from Convex.
 * This is the single source of truth for insights.
 */
const AIInsights: React.FC<AIInsightsProps> = ({ plan, planId }) => {
  const insightsPage = useQuery(api.insights.listInsights, planId ? { planId } : { });

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
        <div className="flex items-center space-x-2">
          <FaLightbulb className="text-[var(--accent-cyan,#22D3EE)]" />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>
            AI Insights
          </h2>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          AI insights based on your plan and recent activity
        </p>
      </div>

      <div className="p-6">
        {insights.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">No insights yet.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-4">
            {insights.map((ins: any) => {
              const date = new Date(ins.createdAt);
              const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={ins._id as string} className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-deep)] shadow-sm">
                  <div className="text-sm text-[var(--text-inverse)] leading-relaxed">{ins.text}</div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--accent-cyan,#22D3EE)] font-medium capitalize">
                      {ins.kind}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formattedDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
};

export default AIInsights;
