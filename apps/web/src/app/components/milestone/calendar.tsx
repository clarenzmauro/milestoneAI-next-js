import React, { useState, lazy, Suspense, useMemo, useCallback } from "react";
import type {
  FullPlan,
  MonthlyMilestone,
  WeeklyObjective,
  DailyTask,
} from "../../types/plan-types";
import { usePlan } from "../../contexts/plan-context";
import { chatWithAI } from "../../services/ai-service";
import { FaCheck, FaCalendarAlt } from "react-icons/fa";

// Lazy load modal component
const TaskModal = lazy(() => import("../modals/task-modal"));

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
const Calendar: React.FC<CalendarProps> = ({
  plan,
  streamingText,
  streamingPlan,
}) => {
  const { toggleTaskCompletion } = usePlan();
  const [currentDate] = React.useState(new Date());
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<{monthIndex: number, weekIndex: number, taskDay: number} | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

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

  // Generate calendar data structure with actual dates
  const calendarData = React.useMemo(() => {
    if (!displayPlan || !planDateRange) return [];

    const data: Array<{
      date: Date;
      month: MonthlyMilestone | null;
      week: WeeklyObjective | null;
      tasks: DailyTask[];
      isCurrentMonth: boolean;
      isToday: boolean;
      hasTasks: boolean;
    }> = [];

    const { startDate, totalDays } = planDateRange;

    // Flatten all tasks into a sequential array first
    const allTasks: DailyTask[] = [];
    const taskToMonthMap: Map<DailyTask, MonthlyMilestone> = new Map();
    const taskToWeekMap: Map<DailyTask, WeeklyObjective> = new Map();

    if (displayPlan.monthlyMilestones) {
      displayPlan.monthlyMilestones.forEach((month) => {
        if (month.weeklyObjectives) {
          month.weeklyObjectives.forEach((week) => {
            if (week.dailyTasks) {
              week.dailyTasks.forEach((task) => {
                allTasks.push(task);
                taskToMonthMap.set(task, month);
                taskToWeekMap.set(task, week);
              });
            }
          });
        }
      });
    }

    // Generate dates for the plan duration
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      // Get the task for this day (if available)
      const task = allTasks[i];
      const foundTasks = task ? [task] : [];
      const currentMonth = task ? taskToMonthMap.get(task) || null : null;
      const currentWeek = task ? taskToWeekMap.get(task) || null : null;

      data.push({
        date,
        month: currentMonth,
        week: currentWeek,
        tasks: foundTasks,
        isCurrentMonth:
          date.getMonth() === currentDate.getMonth() &&
          date.getFullYear() === currentDate.getFullYear(),
        isToday: date.toDateString() === currentDate.toDateString(),
        hasTasks: foundTasks.length > 0,
      });
    }

    return data;
  }, [displayPlan, planDateRange, currentDate]);

  // Group calendar data by actual calendar months
  const monthsData = React.useMemo(() => {
    const months: Array<{
      monthName: string;
      year: number;
      monthData: MonthlyMilestone | null;
      weeks: Array<{
        weekStart: Date;
        days: Array<{
          date: Date;
          month: MonthlyMilestone | null;
          week: WeeklyObjective | null;
          tasks: DailyTask[];
          isCurrentMonth: boolean;
          isToday: boolean;
          hasTasks: boolean;
          dayOfWeek: number; // 0-6, Sunday-Saturday
        }>;
      }>;
    }> = [];

    if (calendarData.length === 0) return months;

    // Group days by month
    const daysByMonth: { [key: string]: typeof calendarData } = {};
    calendarData.forEach((day) => {
      const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
      if (!daysByMonth[monthKey]) {
        daysByMonth[monthKey] = [];
      }
      daysByMonth[monthKey].push(day);
    });

    // Convert to months array
    Object.keys(daysByMonth)
      .sort((a, b) => {
        // Parse year and month from keys like "2025-9"
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        // Sort by year first, then by month
        if (yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
      })
      .forEach((monthKey) => {
        const days = daysByMonth[monthKey];
        const firstDay = days[0];
        const monthData =
          displayPlan?.monthlyMilestones?.find(
            (m) => m.month === firstDay.date.getMonth() + 1
          ) || null;

        // Group days by weeks (starting Sunday)
        const weeks: Array<{
          weekStart: Date;
          days: Array<{
            date: Date;
            month: MonthlyMilestone | null;
            week: WeeklyObjective | null;
            tasks: DailyTask[];
            isCurrentMonth: boolean;
            isToday: boolean;
            hasTasks: boolean;
            dayOfWeek: number;
          }>;
        }> = [];

        const daysInMonth = days;
        let currentWeek: (typeof weeks)[0]["days"] = [];
        let weekStart = new Date(firstDay.date);

        // Find the Sunday of the first week
        const dayOfWeek = firstDay.date.getDay(); // 0 = Sunday, 6 = Saturday
        weekStart.setDate(firstDay.date.getDate() - dayOfWeek);

        daysInMonth.forEach((day) => {
          const dayOfWeek = day.date.getDay();

          // If this is Sunday and we have days in current week, start new week
          if (dayOfWeek === 0 && currentWeek.length > 0) {
            weeks.push({
              weekStart: new Date(weekStart),
              days: [...currentWeek],
            });
            currentWeek = [];
            weekStart = new Date(day.date);
          }

          currentWeek.push({
            ...day,
            dayOfWeek,
          });
        });

        // Add the last week if it has days
        if (currentWeek.length > 0) {
          weeks.push({
            weekStart,
            days: currentWeek,
          });
        }

        months.push({
          monthName: firstDay.date.toLocaleDateString("en-US", {
            month: "long",
          }),
          year: firstDay.date.getFullYear(),
          monthData,
          weeks,
        });
      });

    return months;
  }, [calendarData, displayPlan?.monthlyMilestones]);

  const handleTaskClick = (task: DailyTask, monthIndex: number, weekIndex: number, taskDay: number) => {
    setSelectedTask(task);
    setSelectedTaskIndices({ monthIndex, weekIndex, taskDay });
    setIsTaskModalOpen(true);
  };

  const handleTaskToggle = useCallback(async (task: DailyTask) => {
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
  }, [displayPlan, toggleTaskCompletion]);

  const handleSendMessage = useCallback(async (
    message: string,
    task: DailyTask,
    plan: FullPlan
  ): Promise<string> => {
    try {
      // Create a contextual message for the AI that prioritizes user's message
      // but provides task context for relevant responses
      const contextualMessage = `User: ${message}

Context: You're chatting about this task: "${task.description}"
This task is part of a 90-day plan with the goal: "${plan.goal}"
Current task status: ${task.completed ? "COMPLETED" : "NOT COMPLETED"}

IMPORTANT: Analyze the user's message carefully.

- If the message is a simple greeting, single word, or casual phrase (like "hey", "hi", "hello", "sup", "yo", "hey there", "what's up", "howdy"), respond with a very brief, friendly, casual reply. Do NOT provide task guidance or explanations.
- If the message shows clear intent to get help, advice, or information about the task (like "how do I...", "what should I...", "can you explain...", "help with..."), then provide helpful guidance about the task.
- If the message is a question or statement that relates to the task content, provide relevant guidance.
- Default to brief, casual responses for unclear or very short messages.`;

      // Use empty history for task-specific chat
      const history: Array<{ role: "user" | "model"; parts: string }> = [];

      return await chatWithAI(contextualMessage, history, plan);
    } catch (error) {
      console.error("Failed to send message to AI:", error);
      return "Sorry, I encountered an error while processing your question. Please try again.";
    }
  }, [chatWithAI]);

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

        {/* Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
            setSelectedTaskIndices(null);
          }}
          task={selectedTask}
          plan={displayPlan || null}
          monthIndex={selectedTaskIndices?.monthIndex ?? 0}
          weekIndex={selectedTaskIndices?.weekIndex ?? 0}
          taskDay={selectedTaskIndices?.taskDay ?? 0}
          onToggleComplete={handleTaskToggle}
          onSendMessage={handleSendMessage}
        />
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
            Plan Calendar
          </h2>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Track your milestones, objectives, and daily tasks
        </p>
      </div>

      <div className="p-6 space-y-8">
        {monthsData.map((month, monthIndex) => (
          <div key={`${month.monthName}-${month.year}`} className="space-y-4">
            {/* Month Header */}
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{ color: "var(--text-inverse)" }}
              >
                {month.monthName} {month.year}
              </h3>
              {month.monthData && (
                <div className="text-sm text-[var(--text-secondary,#6c757d)] max-w-md">
                  {month.monthData.milestone}
                </div>
              )}
            </div>

            {/* Calendar Grid */}
            <div className="bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-[var(--neutral-950)] border-b border-[var(--border-subtle)]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="p-3 text-center text-sm font-medium text-[var(--text-muted)]"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              {/* Weeks */}
              {month.weeks.map((week, weekIndex) => {
                // Create a full 7-day week with empty cells
                const fullWeek = Array.from({ length: 7 }, (_, i) => {
                  const dayData = week.days.find((d) => d.dayOfWeek === i);
                  return (
                    dayData || {
                      date: new Date(
                        week.weekStart.getTime() + i * 24 * 60 * 60 * 1000
                      ),
                      month: null,
                      week: null,
                      tasks: [],
                      isCurrentMonth: false,
                      isToday: false,
                      hasTasks: false,
                      dayOfWeek: i,
                    }
                  );
                });

                return (
                  <div
                    key={weekIndex}
                    className="grid grid-cols-7 border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    {fullWeek.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`min-h-[100px] p-2 border-r border-[var(--border-subtle)] last:border-r-0 ${
                          day.isCurrentMonth
                            ? day.isToday
                              ? "bg-[var(--surface-card)]"
                              : "bg-[var(--bg-deep)]"
                            : "bg-[var(--neutral-950)]"
                        } ${day.hasTasks ? "ring-2 ring-[var(--accent-cyan,#22D3EE)] ring-opacity-30" : ""}`}
                      >
                        {/* Day Number */}
                        <div
                          className={`text-xs font-medium mb-1 ${
                            day.isCurrentMonth
                              ? day.isToday
                                ? "text-[var(--accent-cyan,#22D3EE)]"
                                : "text-[var(--text-inverse)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>

                        {/* Tasks */}
                        <div className="space-y-1">
                          {day.tasks.map((task, index) => {
                            const isHovered = hoveredTaskId === `${monthIndex}-${weekIndex}-${task.day}`;
                            return (
                              <div
                                key={task.day}
                                className="cursor-pointer"
                                onClick={() => handleTaskClick(task, monthIndex, weekIndex, task.day)}
                                onMouseEnter={() => setHoveredTaskId(`${monthIndex}-${weekIndex}-${task.day}`)}
                                onMouseLeave={() => setHoveredTaskId(null)}
                              >
                                <div className="flex items-start space-x-1">
                                  <div
                                    className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                                      task.completed
                                        ? "bg-[var(--accent-cyan,#22D3EE)] border-[var(--accent-cyan,#22D3EE)]"
                                        : `border-[var(--border-subtle)] ${isHovered ? "border-[var(--accent-cyan,#22D3EE)]" : ""}`
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskToggle(task);
                                    }}
                                    title={task.completed ? "Mark incomplete" : "Mark complete"}
                                  >
                                    {task.completed && (
                                      <FaCheck className="text-white text-xs" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-xs leading-tight transition-colors ${
                                      task.completed
                                        ? "line-through text-[var(--text-secondary)]"
                                        : `${isHovered ? "text-[var(--accent-cyan)]" : "text-[var(--text-inverse)]"}`
                                    }`}
                                  >
                                    {task.description}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Task count indicator for days with tasks */}
                        {day.hasTasks && day.tasks.length > 1 && (
                          <div className="mt-1 text-xs text-[var(--accent-cyan,#22D3EE)] font-medium">
                            +{day.tasks.length - 1} more
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Task Modal */}
      <Suspense fallback={null}>
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
            setSelectedTaskIndices(null);
          }}
          task={selectedTask}
          plan={displayPlan}
          monthIndex={selectedTaskIndices?.monthIndex ?? 0}
          weekIndex={selectedTaskIndices?.weekIndex ?? 0}
          taskDay={selectedTaskIndices?.taskDay ?? 0}
          onToggleComplete={handleTaskToggle}
          onSendMessage={handleSendMessage}
        />
      </Suspense>
    </article>
  );
};

export default Calendar;
