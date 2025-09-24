import React from 'react';
import type { FullPlan, DailyTask } from '../../types/planTypes';
import { FaLightbulb, FaChartLine, FaTrophy, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

interface AIInsightsProps {
  plan?: FullPlan;
}

/**
 * @description
 * AI Insights component that analyzes plan progress and provides contextual insights,
 * recommendations, and progress analytics based on completion rates and patterns.
 *
 * @receives data from:
 * - milestone-page.tsx; plan: Full plan data for analysis
 *
 * @sends data to:
 * - None: Read-only insights display
 *
 * @sideEffects:
 * - None: Pure analysis component
 */
const AIInsights: React.FC<AIInsightsProps> = ({ plan }) => {
  // Show placeholder during plan generation
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
              AI insights will analyze your progress and provide personalized recommendations.
            </p>
          </div>
        </div>
      </article>
    );
  }
  // Calculate progress metrics
  const progressMetrics = React.useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalWeeks = 0;
    let completedWeeks = 0;
    let streaks: { current: number; longest: number } = { current: 0, longest: 0 };

    plan.monthlyMilestones?.forEach(month => {
      month.weeklyObjectives?.forEach(week => {
        totalWeeks++;
        let weekTasks = 0;
        let weekCompletedTasks = 0;

        week.dailyTasks?.forEach(task => {
          totalTasks++;
          weekTasks++;
          if (task.completed) {
            completedTasks++;
            weekCompletedTasks++;
          }
        });

        // Check if week is completed
        if (weekTasks > 0 && weekTasks === weekCompletedTasks) {
          completedWeeks++;
        }
      });
    });

    // Calculate completion streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    plan.monthlyMilestones?.forEach(month => {
      month.weeklyObjectives?.forEach(week => {
        week.dailyTasks?.forEach(task => {
          if (task.completed) {
            tempStreak++;
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
            }
          } else {
            tempStreak = 0;
          }
        });
      });
    });

    // Current streak (from the end)
    let tasks: DailyTask[] = [];
    plan.monthlyMilestones?.forEach(month => {
      month.weeklyObjectives?.forEach(week => {
        week.dailyTasks?.forEach(task => {
          tasks.push(task);
        });
      });
    });

    for (let i = tasks.length - 1; i >= 0; i--) {
      if (tasks[i].completed) {
        currentStreak++;
      } else {
        break;
      }
    }

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const weeklyProgress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      overallProgress,
      weeklyProgress,
      completedWeeks,
      totalWeeks,
      streaks: { current: currentStreak, longest: longestStreak }
    };
  }, [plan]);

  // Generate insights based on progress
  const insights = React.useMemo(() => {
    const insights = [];

    // Overall progress insight
    if (progressMetrics.overallProgress >= 80) {
      insights.push({
        type: 'success',
        icon: FaTrophy,
        title: 'Excellent Progress!',
        message: `You've completed ${progressMetrics.overallProgress}% of your tasks. You're on track to achieve your goal!`
      });
    } else if (progressMetrics.overallProgress >= 50) {
      insights.push({
        type: 'info',
        icon: FaChartLine,
        title: 'Good Momentum',
        message: `You're at ${progressMetrics.overallProgress}% completion. Keep up the steady progress!`
      });
    } else if (progressMetrics.overallProgress >= 25) {
      insights.push({
        type: 'warning',
        icon: FaClock,
        title: 'Building Momentum',
        message: `You're at ${progressMetrics.overallProgress}% completion. Focus on completing tasks consistently.`
      });
    } else {
      insights.push({
        type: 'warning',
        icon: FaExclamationTriangle,
        title: 'Getting Started',
        message: `You're at ${progressMetrics.overallProgress}% completion. Start with small, achievable tasks to build momentum.`
      });
    }

    // Streak insights
    if (progressMetrics.streaks.current >= 7) {
      insights.push({
        type: 'success',
        icon: FaCheckCircle,
        title: 'Impressive Streak!',
        message: `You've completed ${progressMetrics.streaks.current} tasks in a row. You're building great habits!`
      });
    } else if (progressMetrics.streaks.current >= 3) {
      insights.push({
        type: 'info',
        icon: FaCheckCircle,
        title: 'Building Consistency',
        message: `You're on a ${progressMetrics.streaks.current}-day completion streak. Keep it going!`
      });
    }

    // Weekly progress insight
    if (progressMetrics.weeklyProgress < 50 && progressMetrics.completedWeeks > 0) {
      insights.push({
        type: 'info',
        icon: FaLightbulb,
        title: 'Weekly Focus',
        message: 'Consider focusing on completing entire weeks rather than individual tasks for better momentum.'
      });
    }

    // Upcoming deadlines insight
    const today = new Date();
    const upcomingTasks = [];

    plan.monthlyMilestones?.forEach((month, monthIndex) => {
      month.weeklyObjectives?.forEach((week, weekIndex) => {
        week.dailyTasks?.forEach(task => {
          // Calculate approximate date for this task
          const taskDate = new Date(today);
          taskDate.setDate(today.getDate() + (monthIndex * 30) + (weekIndex * 7) + task.day - 1);

          if (!task.completed && taskDate > today && taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
            upcomingTasks.push({ task, date: taskDate });
          }
        });
      });
    });

    if (upcomingTasks.length > 0) {
      insights.push({
        type: 'info',
        icon: FaClock,
        title: 'Upcoming Tasks',
        message: `You have ${upcomingTasks.length} task${upcomingTasks.length !== 1 ? 's' : ''} due in the next week.`
      });
    }

    return insights;
  }, [progressMetrics, plan]);

  const getInsightStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-[var(--bg-deep)] border-[var(--border-subtle)] text-[var(--text-inverse)]';
      case 'warning':
        return 'bg-[var(--bg-deep)] border-[var(--border-subtle)] text-[var(--text-inverse)]';
      case 'info':
      default:
        return 'bg-[var(--bg-deep)] border-[var(--border-subtle)] text-[var(--text-inverse)]';
    }
  };

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
          Personalized insights to help you stay on track
        </p>
      </div>

      <div className="p-6">
        {/* Progress Overview */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-[var(--text-inverse)] mb-4">
            Progress Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
              <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                {progressMetrics.overallProgress}%
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Overall Progress
              </div>
            </div>
            <div className="text-center p-4 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
              <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                {progressMetrics.completedTasks}
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Tasks Completed
              </div>
            </div>
            <div className="text-center p-4 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
              <div className="text-2xl font-bold text-[var(--text-inverse)]">
                {progressMetrics.streaks.current}
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Current Streak
              </div>
            </div>
            <div className="text-center p-4 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
              <div className="text-2xl font-bold text-[var(--text-inverse)]">
                {progressMetrics.streaks.longest}
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Best Streak
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div>
          <h3 className="text-lg font-medium text-[var(--text-inverse)] mb-4">
            Insights & Recommendations
          </h3>
          <div className="space-y-4">
            {insights.map((insight, index) => {
              const IconComponent = insight.icon;
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getInsightStyles(insight.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <IconComponent className="text-lg mt-0.5 flex-shrink-0 text-[var(--accent-cyan,#22D3EE)]" />
                    <div>
                      <h4 className="font-medium mb-1 text-[var(--text-inverse)]">{insight.title}</h4>
                      <p className="text-sm text-[var(--text-muted)]">{insight.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
};

export default AIInsights;
