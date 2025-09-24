import React from 'react';
import type { FullPlan, MonthlyMilestone, WeeklyObjective, DailyTask } from '../../types/planTypes';
import { usePlan } from '../../contexts/PlanContext';
import { FaCheck, FaClock, FaCalendarAlt } from 'react-icons/fa';

interface CalendarProps {
  plan?: FullPlan | null;
  streamingText?: string;
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
const Calendar: React.FC<CalendarProps> = ({ plan, streamingText }) => {
  const { toggleTaskCompletion } = usePlan();
  const [currentDate] = React.useState(new Date());

  // Show streaming text if available (during plan generation)
  if (streamingText) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[var(--border-color,#E5E9ED)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color,#E5E9ED)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaCalendarAlt className="text-[var(--accent-color,#4A90E2)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary,#1A1A1A)]">
                Live Plan Generation
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              </div>
              <span className="text-xs text-cyan-400 font-medium">Streaming</span>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary,#6c757d)] mt-1">
            Gemini AI is creating your personalized milestone plan in real-time
          </p>
        </div>

        <div className="p-6">
          {/* Streaming Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400/30"></div>
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-cyan-400 absolute top-0"></div>
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary,#1A1A1A)]">AI Plan Generation</h3>
                <p className="text-xs text-[var(--text-secondary,#6c757d)]">
                  Processing with Gemini 2.5 Flash
                </p>
              </div>
            </div>
            <div className="text-xs text-[var(--text-secondary,#6c757d)]">
              {streamingText.length} characters generated
            </div>
          </div>

          {/* Streaming Content */}
          <div className="relative">
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 p-6 min-h-[300px]">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">G</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary,#1A1A1A)]">Gemini AI</span>
                    <span className="text-xs text-[var(--text-secondary,#6c757d)]">Generating milestone plan...</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <pre className="text-sm leading-6 whitespace-pre-wrap font-mono text-[var(--text-primary,#1A1A1A)] bg-transparent border-0 p-0 m-0">
                      {streamingText}
                    </pre>
                    {/* Typing indicator */}
                    <span className="inline-block w-2 h-5 bg-cyan-400 animate-pulse ml-1 align-baseline"></span>
                  </div>
                </div>
              </div>

              {/* Progress indicator at bottom */}
              <div className="mt-6 pt-4 border-t border-cyan-200">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary,#6c757d)]">
                  <span>Building your milestone roadmap...</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no plan provided
  if (!plan) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[var(--border-color,#E5E9ED)] overflow-hidden">
        <div className="p-6 text-center">
          <FaCalendarAlt className="text-[var(--accent-color,#4A90E2)] text-4xl mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary,#1A1A1A)] mb-2">
            No Plan Available
          </h2>
          <p className="text-sm text-[var(--text-secondary,#6c757d)]">
            Start by creating your first milestone plan.
          </p>
        </div>
      </div>
    );
  }

  // Calculate the start date (beginning of current month)
  const startDate = React.useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date;
  }, [currentDate]);

  // Generate calendar data structure
  const calendarData = React.useMemo(() => {
    const data: Array<{
      date: Date;
      month: MonthlyMilestone | null;
      week: WeeklyObjective | null;
      tasks: DailyTask[];
      isCurrentMonth: boolean;
    }> = [];

    // Generate dates for the next 90 days (3 months)
    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const monthIndex = Math.floor(i / 30); // 30 days per month approx
      const weekIndex = Math.floor((i % 30) / 7); // 7 days per week
      const dayIndex = (i % 30) % 7; // Day within week (0-6)

      const month = plan.monthlyMilestones?.[monthIndex] || null;
      const week = month?.weeklyObjectives?.[weekIndex] || null;
      const tasks = week?.dailyTasks?.filter(task => task.day === dayIndex + 1) || [];

      data.push({
        date,
        month,
        week,
        tasks,
        isCurrentMonth: date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
      });
    }

    return data;
  }, [plan, startDate, currentDate]);

  // Group calendar data by months
  const monthsData = React.useMemo(() => {
    const months: Array<{
      monthName: string;
      monthData: MonthlyMilestone | null;
      weeks: Array<{
        weekData: WeeklyObjective | null;
        days: typeof calendarData;
      }>;
    }> = [];

    for (let monthIndex = 0; monthIndex < 3; monthIndex++) {
      const monthStart = monthIndex * 30;
      const monthEnd = Math.min((monthIndex + 1) * 30, calendarData.length);
      const monthDays = calendarData.slice(monthStart, monthEnd);

      const monthData = plan.monthlyMilestones?.[monthIndex] || null;

      // Group by weeks
      const weeks = [];
      for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
        const weekStart = weekIndex * 7;
        const weekEnd = Math.min((weekIndex + 1) * 7, monthDays.length);
        const weekDays = monthDays.slice(weekStart, weekEnd);

        const weekData = monthData?.weeklyObjectives?.[weekIndex] || null;

        weeks.push({
          weekData,
          days: weekDays
        });
      }

      const monthName = new Date(startDate.getFullYear(), startDate.getMonth() + monthIndex, 1)
        .toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      months.push({
        monthName,
        monthData,
        weeks
      });
    }

    return months;
  }, [calendarData, plan.monthlyMilestones, startDate]);

  const handleTaskToggle = async (monthIndex: number, weekIndex: number, taskDay: number) => {
    await toggleTaskCompletion(monthIndex, weekIndex, taskDay);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--border-color,#E5E9ED)] overflow-hidden">
      <div className="p-6 border-b border-[var(--border-color,#E5E9ED)]">
        <div className="flex items-center space-x-2">
          <FaCalendarAlt className="text-[var(--accent-color,#4A90E2)]" />
          <h2 className="text-xl font-semibold text-[var(--text-primary,#1A1A1A)]">
            Plan Calendar
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary,#6c757d)] mt-1">
          Track your milestones, objectives, and daily tasks
        </p>
      </div>

      <div className="p-6 space-y-8">
        {monthsData.map((month, monthIndex) => (
          <div key={monthIndex} className="space-y-4">
            {/* Month Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary,#1A1A1A)]">
                {month.monthName}
              </h3>
              {month.monthData && (
                <div className="text-sm text-[var(--text-secondary,#6c757d)] max-w-md">
                  {month.monthData.milestone}
                </div>
              )}
            </div>

            {/* Weeks */}
            <div className="space-y-6">
              {month.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="space-y-2">
                  {/* Week Header */}
                  {week.weekData && (
                    <div className="flex items-center space-x-2 text-sm font-medium text-[var(--text-primary,#1A1A1A)]">
                      <FaClock className="text-[var(--accent-color-week,#50B83C)]" />
                      <span>Week {week.weekData.week}</span>
                      <span className="text-[var(--text-secondary,#6c757d)] font-normal">
                        • {week.weekData.objective}
                      </span>
                    </div>
                  )}

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {week.days.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`min-h-[120px] p-3 rounded-lg border ${
                          day.isCurrentMonth
                            ? 'bg-white border-[var(--border-color,#E5E9ED)]'
                            : 'bg-[var(--background-tertiary,#f8f9fa)] border-[var(--border-color,#E5E9ED)]'
                        }`}
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${
                            day.isCurrentMonth
                              ? 'text-[var(--text-primary,#1A1A1A)]'
                              : 'text-[var(--text-disabled,#adb5bd)]'
                          }`}>
                            {day.date.getDate()}
                          </span>
                          {day.tasks.length > 0 && (
                            <span className="text-xs bg-[var(--accent-color,#4A90E2)] text-white px-2 py-1 rounded">
                              {day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Tasks */}
                        <div className="space-y-1">
                          {day.tasks.map((task) => (
                            <div
                              key={task.day}
                              className="flex items-start space-x-2"
                            >
                              <button
                                onClick={() => handleTaskToggle(monthIndex, weekIndex, task.day)}
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  task.completed
                                    ? 'bg-[var(--accent-color,#4A90E2)] border-[var(--accent-color,#4A90E2)]'
                                    : 'border-[var(--border-color,#E5E9ED)] hover:border-[var(--accent-color,#4A90E2)]'
                                }`}
                                aria-label={`Mark task "${task.description}" as ${task.completed ? 'incomplete' : 'complete'}`}
                              >
                                {task.completed && (
                                  <FaCheck className="text-white text-xs" />
                                )}
                              </button>
                              <span className={`text-xs leading-tight ${
                                task.completed
                                  ? 'line-through text-[var(--text-disabled,#adb5bd)]'
                                  : 'text-[var(--text-primary,#1A1A1A)]'
                              }`}>
                                {task.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
