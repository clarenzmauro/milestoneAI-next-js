import React, { useState, useMemo, useCallback } from 'react';
import { usePlan } from '../../contexts/PlanContext';
// Tailwind classes inlined; CSS module removed
import type { MonthlyMilestone, WeeklyObjective, DailyTask } from '../../types/planTypes';
import { FaLightbulb, FaTrophy } from 'react-icons/fa';
import BarLoader from "react-spinners/BarLoader";
import AchievementsModal from '../modals/AchievementsModal';
import { teamMembers } from '../../config/team';
import { parsePlanString } from '../../utils/planParser';

/**
 * @description
 * Renders the main plan view: progress, monthly/weekly/daily sections, streaming UI,
 * and achievements modal. Uses Tailwind for layout and styling.
 *
 * @receives data from:
 * - contexts/PlanContext.tsx; usePlan: Current plan, streaming text, loading and error state
 *
 * @sends data to:
 * - contexts/PlanContext.tsx; toggleTaskCompletion: Persist task completion changes
 * - components/modals/AchievementsModal.tsx; AchievementsModal: Open/close modal
 *
 * @sideEffects:
 * - None; relies on PlanContext for persistence side effects
 */
const MainContent: React.FC = () => {
  const { plan, streamingPlanText, isLoading, error, toggleTaskCompletion } = usePlan();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState<boolean>(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

  // Parse streaming plan text in real-time
  const streamingPlan = useMemo(() => {
    if (!streamingPlanText) return null;
    
    // Try to extract goal from streaming text
    const goalMatch = streamingPlanText.match(/# Goal:\s*(.+)/);
    const goal = goalMatch ? goalMatch[1].trim() : 'Your Goal';
    
    // Try to parse what we have so far
    try {
      return parsePlanString(streamingPlanText, goal);
    } catch {
      // If parsing fails, return null and let the component show loading state
      return null;
    }
  }, [streamingPlanText]);

  // Use either the final plan or the streaming plan
  const currentPlan = plan || streamingPlan;

  const { totalTasks, completedTasks, progressPercentage } = useMemo(() => {
    if (!plan?.monthlyMilestones) {
      return { totalTasks: 0, completedTasks: 0, progressPercentage: 0 };
    }

    let total = 0;
    let completed = 0;

    plan.monthlyMilestones.forEach(month => {
      month.weeklyObjectives?.forEach(week => {
        week.dailyTasks?.forEach(task => {
          total++;
          if (task.completed) {
            completed++;
          }
        });
      });
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTasks: total, completedTasks: completed, progressPercentage: percentage };
  }, [plan]);

  const handleTaskToggle = useCallback((taskDay: number) => {
    if (!plan) return;
    const taskToToggle = plan.monthlyMilestones?.[selectedMonthIndex]
      ?.weeklyObjectives?.[selectedWeekIndex]
      ?.dailyTasks?.find(t => t.day === taskDay);

    if (taskToToggle) {
      toggleTaskCompletion(selectedMonthIndex, selectedWeekIndex, taskDay);
    }
  }, [plan, selectedMonthIndex, selectedWeekIndex, toggleTaskCompletion]);

  // Show streaming text if we have it but no parsed plan yet
  if (streamingPlanText && !currentPlan) {
    return (
      <div className="flex-1 p-8 bg-[var(--background-main,#f0f2f5)] overflow-y-auto h-full flex flex-col items-center justify-center text-[var(--text-secondary,#6c757d)]">
        <BarLoader color="#4A90E2" loading width={150} height={4} aria-label="Loading Spinner" data-testid="loader" />
        <p className="mt-6 text-[1.1rem] font-medium text-[var(--text-primary,#343a40)]">Generating your plan...</p>
        <div className="mt-8 max-w-full max-h-[60vh] overflow-y-auto bg-white rounded border border-[var(--border-color,#E5E9ED)] shadow">
          <pre className="p-6 m-0 font-sans text-sm leading-6 text-[var(--text-primary,#1A1A1A)] whitespace-pre-wrap break-words bg-transparent border-0 outline-none">{streamingPlanText}</pre>
        </div>
      </div>
    );
  }

  if (isLoading && !currentPlan) {
    return (
      <div className="flex-1 p-8 bg-[var(--background-main,#f0f2f5)] overflow-y-auto h-full flex flex-col items-center justify-center text-[var(--text-secondary,#6c757d)]">
        <BarLoader color="#4A90E2" loading width={150} height={4} aria-label="Loading Spinner" data-testid="loader" />
        <p className="mt-6 text-[1.1rem] font-medium text-[var(--text-primary,#343a40)]">Generating your plan...</p>
      </div>
    );
  }

  if (error) {
    return <div className="flex-1 p-8 bg-[var(--background-main,#f0f2f5)] overflow-y-auto h-full flex items-center justify-center text-[var(--text-secondary,#6c757d)]">Error loading plan: {error}</div>;
  }

  if (!currentPlan) {
    return (
      <div className="flex-1 p-8 bg-[var(--background-main,#f0f2f5)] overflow-y-auto h-full flex items-center justify-center">
        <div className="flex flex-col items-center text-center text-[var(--text-secondary,#6c757d)] bg-[var(--background-secondary,#f8f9fa)] p-8 rounded border-0 max-w-[450px]">
          {React.createElement(FaLightbulb as React.ElementType, { 'aria-hidden': 'true', className: 'text-[3.5rem] text-[var(--accent-color,#007bff)] mb-6' })}
          <h2 className="text-[1.5rem] font-semibold text-[var(--text-primary,#343a40)] mb-3">Ready to Plan Your Success?</h2>
          <p className="text-base leading-6 text-[var(--text-secondary,#6c757d)]">Use the sidebar to create your first goal and let MilestoneAI build your roadmap.</p>

          <h3 className="text-[1.2rem] font-semibold text-[var(--text-primary,#343a40)] mt-10 mb-6">Meet the Team</h3>
          <div className="flex flex-wrap justify-center gap-8 max-w-full">
            {teamMembers.map((member) => (
              <a key={member.username} href={member.link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-inherit transition-transform duration-200 min-w-[100px] hover:-translate-y-0.5">
                <img src={member.avatarUrl} alt={`${member.name}'s avatar`} className="w-[60px] h-[60px] rounded-full mb-3 object-cover border-2 border-[var(--border-color,#ddd)]" width={60} height={60} />
                <span className="text-sm font-medium text-[var(--text-secondary,#4a4a4a)] text-center">{member.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const monthsData: MonthlyMilestone[] = currentPlan.monthlyMilestones || [];

  const renderPlaceholders = (
    type: 'week' | 'day',
    totalSlots: number,
    filledSlots: number,
    monthIndex: number,
    weekIndex?: number
  ) => {
    const placeholderCount = Math.max(0, totalSlots - filledSlots);
    return Array.from({ length: placeholderCount }).map((_, i) => {
      const index = filledSlots + i + 1;
      const key = type === 'week'
        ? `placeholder-week-${monthIndex}-${index}`
        : `placeholder-day-${monthIndex}-${weekIndex}-${index}`;
      return <PlaceholderCard key={key} type={type} index={index} />;
    });
  };

  return (
    <main className="flex-1 p-8 bg-[var(--background-main,#f0f2f5)] overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-semibold text-[var(--text-primary,#1A1A1A)] m-0">Goal: {currentPlan.goal}</h1>
        {plan && (
          <button
            onClick={() => setIsAchievementsModalOpen(true)}
            className="bg-transparent border-0 px-2 ml-4 cursor-pointer text-[#b0a47a] text-xl hover:text-[#d4af37]"
            title="View Achievements"
          >
            <FaTrophy />
          </button>
        )}
      </div>

      <section className="mb-8 p-4 bg-[#f9f9f9] rounded shadow-[var(--shadow-elevation-low)]">
        <h2 className="m-0 mb-2 text-[1.2rem] text-[var(--text-primary)]">Overall Progress</h2>
        <div className="w-full bg-[var(--background-tertiary,#e9ecef)] rounded-[15px] h-7 overflow-hidden mb-3 border border-[var(--border-color,#ced4da)] shadow-inner">
          <div
            className="h-full text-white flex items-center justify-center text-sm font-medium text-center transition-all duration-500 whitespace-nowrap"
            style={{ width: `${progressPercentage}%`, background: 'linear-gradient(90deg, var(--accent-color-light,#5cadff), var(--accent-color,#007bff))' }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {`${progressPercentage}%`}
          </div>
        </div>
        <p className="text-center text-sm text-[var(--text-secondary)] m-0">{completedTasks} of {totalTasks} tasks completed</p>
      </section>

      <section>
        <h2 className="text-[20px] font-semibold my-4 text-[var(--text-primary,#1A1A1A)]">Monthly Milestones</h2>
        <div className="grid gap-6 mb-8 grid-cols-3 max-[1200px]:grid-cols-2 max-[768px]:grid-cols-1">
          {monthsData.map((month: MonthlyMilestone, monthIndex) => (
            <button
              type="button"
              key={month.month}
              className={`text-left border rounded-[12px] p-5 min-h-[140px] bg-white border-[var(--border-color,#E5E9ED)] flex flex-col transition ${selectedMonthIndex === monthIndex ? 'border-[var(--primary-color,#4a90e2)] shadow-[0_0_10px_rgba(74,144,226,0.3)] bg-[var(--selected-background,#f0f8ff)]' : 'hover:-translate-y-0.5 hover:shadow'}`}
              onClick={() => {
                setSelectedMonthIndex(monthIndex);
                setSelectedWeekIndex(0);
              }}
            >
              <div className="text-[16px] font-semibold mb-3 text-[var(--text-primary,#1A1A1A)] border-t-4 border-[var(--accent-color-month,#4A90E2)] pt-3">Month {month.month}</div>
              <div className="text-sm text-[var(--text-secondary,#4A4A4A)] leading-6 flex-1">{month.milestone}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-semibold mb-4 text-[var(--text-primary,#1A1A1A)]">Weekly Objectives</h2>
        <div className="grid gap-6 mb-8 grid-cols-4 max-[1200px]:grid-cols-2 max-[768px]:grid-cols-1">
          {(monthsData[selectedMonthIndex]?.weeklyObjectives || []).map((week: WeeklyObjective, weekIndex) => (
            <button
              type="button"
              key={week.week}
              className={`text-left border rounded-[12px] p-5 min-h-[140px] bg-white border-[var(--border-color,#E5E9ED)] flex flex-col transition ${selectedWeekIndex === weekIndex ? 'border-[var(--primary-color,#4a90e2)] shadow-[0_0_10px_rgba(74,144,226,0.3)] bg-[var(--selected-background,#f0f8ff)]' : 'hover:-translate-y-0.5 hover:shadow'}`}
              onClick={() => setSelectedWeekIndex(weekIndex)}
            >
              <div className="text-[16px] font-semibold mb-3 text-[var(--text-primary,#1A1A1A)] border-t-4 border-[var(--accent-color-week,#50B83C)] pt-3">Week {week.week}</div>
              <div className="text-sm text-[var(--text-secondary,#4A4A4A)] leading-6 flex-1">{week.objective}</div>
            </button>
          ))}
          {renderPlaceholders('week', 4, monthsData[selectedMonthIndex]?.weeklyObjectives?.length ?? 0, selectedMonthIndex)}
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-semibold mb-4 text-[var(--text-primary,#1A1A1A)]">Daily Tasks</h2>
        <div className="grid gap-6 mb-8 grid-cols-4 max-[1200px]:grid-cols-2 max-[768px]:grid-cols-1">
          {(monthsData[selectedMonthIndex]?.weeklyObjectives?.[selectedWeekIndex]?.dailyTasks || []).map((task: DailyTask) => (
            <div key={`${selectedMonthIndex}-${selectedWeekIndex}-${task.day}`} className="border rounded-[12px] p-5 min-h-[140px] bg-white border-[var(--border-color,#E5E9ED)] flex flex-col">
              <div className="flex items-center justify-between text-[16px] font-semibold mb-3 text-[var(--text-primary,#1A1A1A)]">
                Day {task.day}
                <input
                  type="checkbox"
                  className="ml-2 cursor-pointer w-[18px] h-[18px] accent-[var(--accent-color,#007bff)]"
                  checked={!!task.completed}
                  onChange={() => handleTaskToggle(task.day)}
                  aria-label={`Mark task for day ${task.day} as complete`}
                />
              </div>
              <div className="text-sm text-[var(--text-secondary,#4A4A4A)] leading-6 flex-1">{task.description}</div>
            </div>
          ))}
          {renderPlaceholders('day', 7, monthsData[selectedMonthIndex]?.weeklyObjectives?.[selectedWeekIndex]?.dailyTasks?.length ?? 0, selectedMonthIndex, selectedWeekIndex)}
        </div>
      </section>

      <AchievementsModal isOpen={isAchievementsModalOpen} onClose={() => setIsAchievementsModalOpen(false)} />

    </main>
  );
};

interface PlaceholderCardProps {
  type: 'week' | 'day';
  index: number;
}

/**
 * @description
 * Placeholder card for empty week/day slots to preserve grid alignment.
 *
 * @receives data from:
 * - MainContent.tsx; renderPlaceholders: type and index for label
 *
 * @sends data to:
 * - None
 *
 * @sideEffects:
 * - None
 */
const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ type, index }) => {
  const headerText = type === 'week' ? `Week ${index}` : `Day ${index}`;

  return (
    <div className="border rounded-[12px] p-5 min-h-[140px] bg-[var(--background-tertiary,#e9ecef)] border-[var(--border-color,#E5E9ED)] flex flex-col cursor-default">
      <div className="text-[16px] font-semibold mb-3 text-[var(--text-disabled,#adb5bd)]">{headerText}</div>
      <div className="text-sm text-[var(--text-disabled,#adb5bd)] leading-6 flex-1">...</div>
    </div>
  );
};

export default MainContent;
