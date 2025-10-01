import React from "react";
import type {
  FullPlan,
  MonthlyMilestone,
  WeeklyObjective,
  DailyTask,
} from "../../types/planTypes";
import { usePlan } from "../../contexts/plan-context";
import { FaCheck, FaClock, FaCalendarAlt } from "react-icons/fa";

interface CalendarProps {
  plan?: FullPlan | null;
  streamingText?: string;
  streamingPlan?: FullPlan | null; // Parsed plan during streaming
}

/**
 * @description
 * Calendar component that displays plan data as a visual calendar with monthly milestones,
 * weekly objectives, and daily tasks. Includes task completion toggling and progress tracking.
 *
 * @receives data from:
 * - milestone-page.tsx; plan: Full plan data to display in calendar format
 * - contexts/PlanContext.tsx; toggleTaskCompletion: Function to update task completion
 *
 * @sends data to:
 * - contexts/PlanContext.tsx; toggleTaskCompletion: Updates task completion status
 *
 * @sideEffects:
 * - Updates task completion state through context
 */
const PlanTimeline: React.FC<CalendarProps> = ({
  plan,
  streamingText,
  streamingPlan,
}) => {
  const { toggleTaskCompletion } = usePlan();
  const [currentDate] = React.useState(new Date());

  // Use streaming plan if available, otherwise use regular plan
  const displayPlan = streamingPlan || plan;

  // Calculate plan duration and date range
  const planDateRange = React.useMemo(() => {
    if (!displayPlan) return null;

    const startDate = new Date(); // Start from today
    let totalDays = 0;

    // Calculate total days in the plan
    displayPlan.monthlyMilestones?.forEach((month) => {
      month.weeklyObjectives?.forEach((week) => {
        totalDays += week.dailyTasks?.length || 0;
      });
    });

    // If we can't determine duration, default to 90 days
    const planDays = totalDays > 0 ? totalDays : 90;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + planDays - 1);

    return { startDate, endDate, totalDays: planDays };
  }, [displayPlan]);

  const handleTaskToggle = async (task: DailyTask) => {
    // Find the task in the plan structure to get the correct indices
    if (!displayPlan?.monthlyMilestones) return;

    for (
      let monthIdx = 0;
      monthIdx < displayPlan.monthlyMilestones.length;
      monthIdx++
    ) {
      const month = displayPlan.monthlyMilestones[monthIdx];
      if (month.weeklyObjectives) {
        for (
          let weekIdx = 0;
          weekIdx < month.weeklyObjectives.length;
          weekIdx++
        ) {
          const week = month.weeklyObjectives[weekIdx];
          if (week.dailyTasks) {
            const taskIdx = week.dailyTasks.findIndex((t) => t === task);
            if (taskIdx !== -1) {
              await toggleTaskCompletion(monthIdx, weekIdx, task.day);
              return;
            }
          }
        }
      }
    }
  };

  // Show streaming text if available (during plan generation)
  if (streamingText) {
    return (
      <article
        className="group relative overflow-hidden rounded-lg border transition-shadow motion-reduce:transition-none"
        style={{
          background:
            "radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="p-6 border-b border-[var(--border-color,#E5E9ED)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaCalendarAlt className="text-[var(--accent-cyan,#22D3EE)]" />
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text-inverse)" }}
              >
                Live Plan Generation
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full"></div>
              </div>
              <span className="text-xs text-[var(--accent-cyan)] font-medium">
                Streaming
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Gemini AI is creating your personalized milestone plan in real-time
          </p>
        </div>

        <div className="p-6">
          {/* Streaming Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-cyan)]/30"></div>
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-[var(--accent-cyan)] absolute top-0"></div>
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-inverse)]">
                  AI Plan Generation
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Processing with Gemini 2.5 Flash
                </p>
              </div>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {streamingText.length} characters generated
            </div>
          </div>

          {/* Streaming Content */}
          <div className="relative">
            <div className="bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)] p-6 min-h-[300px]">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-teal)] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">G</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-[var(--text-inverse)]">
                      Gemini AI
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Generating milestone plan...
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <pre className="text-sm leading-6 whitespace-pre-wrap font-mono text-[var(--text-inverse)] bg-transparent border-0 p-0 m-0">
                      {streamingText}
                    </pre>
                    {/* Typing indicator */}
                    <span className="inline-block w-2 h-5 bg-[var(--accent-cyan)] animate-pulse ml-1 align-baseline"></span>
                  </div>
                </div>
              </div>

              {/* Progress indicator at bottom */}
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Building your milestone roadmap...</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-[var(--accent-cyan)] rounded-full animate-bounce"></div>
                    <div
                      className="w-1 h-1 bg-[var(--accent-cyan)] rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-[var(--accent-cyan)] rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Show error if no plan provided
  if (!displayPlan) {
    return (
      <article
        className="group relative overflow-hidden rounded-lg border p-6 text-center transition-shadow motion-reduce:transition-none"
        style={{
          background:
            "radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <FaCalendarAlt className="text-[var(--accent-cyan,#22D3EE)] text-4xl mx-auto mb-4" />
        <h3
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--text-inverse)" }}
        >
          No Plan Available
        </h3>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Start by creating your first milestone plan.
        </p>
      </article>
    );
  }

  return (
    <article
      className="group relative overflow-hidden rounded-lg border transition-shadow motion-reduce:transition-none"
      style={{
        background:
          "radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="p-6 border-b border-[var(--border-color,#E5E9ED)]">
        <div className="flex items-center space-x-2">
          <FaCalendarAlt className="text-[var(--accent-cyan,#22D3EE)]" />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-inverse)" }}
          >
            Plan Timeline
          </h2>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Track your milestones, objectives, and daily tasks
        </p>
      </div>

      <div className="p-6 space-y-8">
        {displayPlan?.monthlyMilestones?.map((month, monthIndex) => (
          <div key={`month-${month.month}`} className="space-y-6">
            {/* Month Header */}
            <div className="pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-cyan,#22D3EE)] flex items-center justify-center text-white text-sm font-bold">
                  {month.month}
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "var(--text-inverse)" }}
                  >
                    Month {month.month}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {month.milestone}
                  </p>
                </div>
              </div>
            </div>

            {/* Weeks and Tasks */}
            {month.weeklyObjectives?.map((week, weekIndex) => (
              <div key={`week-${week.week}`} className="ml-11 space-y-3">
                {/* Week Header */}
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-teal,#14B8A6)] flex items-center justify-center text-white text-xs font-bold">
                    {week.week}
                  </div>
                  <h4
                    className="text-base font-medium"
                    style={{ color: "var(--text-inverse)" }}
                  >
                    Week {week.week}: {week.objective}
                  </h4>
                </div>

                {/* Daily Tasks */}
                <div className="ml-9 space-y-2">
                  {week.dailyTasks?.map((task, taskIndex) => (
                    <div
                      key={`task-${task.day}`}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan,#22D3EE)] transition-colors"
                    >
                      <button
                        onClick={() => handleTaskToggle(task)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          task.completed
                            ? "bg-[var(--accent-cyan,#22D3EE)] border-[var(--accent-cyan,#22D3EE)]"
                            : "border-[var(--border-subtle)] hover:border-[var(--accent-cyan,#22D3EE)]"
                        }`}
                        aria-label={`Mark task "${task.description}" as ${task.completed ? "incomplete" : "complete"}`}
                      >
                        {task.completed && (
                          <FaCheck className="text-white text-xs" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-[var(--accent-cyan,#22D3EE)]">
                            Day {task.day}
                          </span>
                          {task.completed && (
                            <span className="text-xs text-[var(--text-secondary)] line-through">
                              Completed
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${
                            task.completed
                              ? "line-through text-[var(--text-secondary)]"
                              : "text-[var(--text-inverse)]"
                          }`}
                        >
                          {task.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
};

export default PlanTimeline;
