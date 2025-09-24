import type { FullPlan, MonthlyMilestone, WeeklyObjective, DailyTask } from '../types/planTypes';

/**
 * Parses a raw markdown-like string into a structured FullPlan object.
 * Can handle partial/incomplete plan strings during streaming.
 *
 * WARNING: This parser is fragile and depends heavily on consistent formatting
 * from the AI (specific Markdown headers like `#`, `##`, `###`, and list markers `-` or `*`).
 * Minor format changes can break the parser or cause incorrect results.
 *
 * Tip: Requesting structured JSON from the AI is a more robust long-term solution.
 *
 * Expected Format Example:
 * # Goal: [User's Goal]    ← (Actual goal is taken from input param)
 *
 * ## Month 1: [Milestone Title]
 * ### Week 1: [Objective Title]
 * - Day 1: [Task description]
 * - Day 2: [Task description]
 * ...
 * ### Week 2: ...
 * ...
 * ## Month 2: ...
 *
 * @param rawPlanString - Raw string from AI (can be partial/incomplete)
 * @param userGoal - User-defined goal
 * @param isStreaming - Whether this is a streaming parse (allows incomplete results)
 * @returns Parsed FullPlan or partial result, or null if parsing fails completely
 */
export const parsePlanString = (rawPlanString: string, userGoal: string, isStreaming = false): FullPlan | null => {
  if (!rawPlanString) return null;

  const lines = rawPlanString.split('\n').filter(line => line.trim() !== '');
  const plan: FullPlan = {
    goal: userGoal,
    monthlyMilestones: [],
  };

  let currentMilestone: MonthlyMilestone | null = null;
  let currentObjective: WeeklyObjective | null = null;
  let monthCounter = 0;
  let weekCounter = 0;
  let dayCounter = 0;
  let hasWeeklyStructure = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Match: ## Month 1: Milestone Title
    const monthMatch = trimmedLine.match(/^#+\s*Month\s*(\d+):?\s*(.*)/i);
    if (monthMatch) {
      monthCounter = parseInt(monthMatch[1], 10);
      currentMilestone = {
        month: monthCounter,
        milestone: monthMatch[2].trim() || `Month ${monthCounter} Milestone`,
        weeklyObjectives: [],
      };
      plan.monthlyMilestones.push(currentMilestone);
      currentObjective = null;
      weekCounter = 0;
      continue;
    }

    // Match: ### Week 1: Objective Title (can be standalone or under months)
    const weekMatch = trimmedLine.match(/^#+\s*Week\s*(\d+):?\s*(.*)/i);
    if (weekMatch) {
      hasWeeklyStructure = true;
      weekCounter = parseInt(weekMatch[1], 10);

      // If we don't have a current milestone, create a synthetic one for weeks without months
      if (!currentMilestone) {
        const syntheticMonthNumber = Math.ceil(weekCounter / 4); // Group weeks into months
        currentMilestone = {
          month: syntheticMonthNumber,
          milestone: `Month ${syntheticMonthNumber} Objectives`,
          weeklyObjectives: [],
        };
        plan.monthlyMilestones.push(currentMilestone);
        monthCounter = syntheticMonthNumber;
      }

      currentObjective = {
        week: weekCounter,
        objective: weekMatch[2].trim() || `Week ${weekCounter} Objective`,
        dailyTasks: [],
      };
      currentMilestone.weeklyObjectives.push(currentObjective);
      dayCounter = 0;
      continue;
    }

    // Match: - Day 1: Task or - Task
    const taskMatch = trimmedLine.match(/^(-|\*)\s*(?:Day\s*(\d+):?)?\s*(.*)/i);
    if (taskMatch && currentObjective) {
      dayCounter++;
      const dayNumber = taskMatch[2] ? parseInt(taskMatch[2], 10) : dayCounter;
      const task: DailyTask = {
        day: dayNumber,
        description: taskMatch[3].trim(),
        completed: false,
      };
      currentObjective.dailyTasks.push(task);
      continue;
    }

    // Optional: append unmatched lines to the last task as a multi-line description
    // if (currentObjective && currentObjective.dailyTasks.length > 0 && /^[a-zA-Z]/.test(trimmedLine)) {
    //   const lastTask = currentObjective.dailyTasks[currentObjective.dailyTasks.length - 1];
    //   lastTask.description += '\n' + trimmedLine;
    // }
  }

  // For streaming, allow partial results
  if (isStreaming) {
    // Return partial plan if we have any content
    if (plan.monthlyMilestones.length > 0 || hasWeeklyStructure) {
      return plan;
    }
  }

  // For complete parsing, require at least some structure
  if (plan.monthlyMilestones.length === 0 && !hasWeeklyStructure) {
    console.warn('Parser could not find any monthly milestones or weekly structure.');
    return null;
  }

  return plan;
};