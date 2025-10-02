import type { FullPlan, MonthlyMilestone, WeeklyObjective, DailyTask } from '../types/plan-types';

// Simple LRU cache for plan parsing to avoid expensive re-parsing
const PLAN_CACHE = new Map<string, FullPlan>();
const MAX_CACHE_SIZE = 10;

function getCacheKey(planString: string, goal: string, duration?: number, isStreaming = false): string {
  return `${planString.length}-${goal}-${duration || 'default'}-${isStreaming}`;
}

function setCache(key: string, value: FullPlan) {
  if (PLAN_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = PLAN_CACHE.keys().next().value;
    if (firstKey) {
      PLAN_CACHE.delete(firstKey);
    }
  }
  PLAN_CACHE.set(key, value);
}

/**
 * Strips markdown formatting from text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic
    .replace(/`(.*?)`/g, '$1')       // Remove code
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    .trim();
}

/**
 * Normalizes task descriptions for duplicate detection
 */
function normalizeTaskDescription(text: string): string {
  return stripMarkdown(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Checks if two task descriptions are similar (basic fuzzy matching)
 */
function areTasksSimilar(task1: string, task2: string, threshold: number = 0.8): boolean {
  const normalized1 = normalizeTaskDescription(task1);
  const normalized2 = normalizeTaskDescription(task2);

  // Exact match after normalization
  if (normalized1 === normalized2) return true;

  // Simple word overlap check
  const words1 = new Set(normalized1.split(' '));
  const words2 = new Set(normalized2.split(' '));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const similarity = intersection.size / union.size;
  return similarity >= threshold;
}

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
 * @param expectedDuration - Expected number of days/tasks
 * @param isStreaming - Whether this is a streaming parse (allows incomplete results)
 * @returns Parsed FullPlan or partial result, or null if parsing fails completely
 */
export const parsePlanString = (rawPlanString: string, userGoal: string, expectedDuration?: number, isStreaming = false): FullPlan | null => {
  if (!rawPlanString) return null;

  // Check cache for completed plans (not streaming)
  if (!isStreaming) {
    const cacheKey = getCacheKey(rawPlanString, userGoal, expectedDuration, isStreaming);
    const cached = PLAN_CACHE.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

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
  let totalTasksFound = 0;
  const seenTasks: string[] = []; // Track unique task descriptions

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
      const rawDescription = taskMatch[3].trim();
      const cleanDescription = stripMarkdown(rawDescription);

      // Check for duplicate or very similar tasks and skip them
      const isDuplicate = seenTasks.some(existingTask =>
        areTasksSimilar(cleanDescription, existingTask, 0.85) // 85% similarity threshold
      );

      if (isDuplicate) {
        console.warn(`Skipping duplicate/similar task: ${cleanDescription}`);
        continue;
      }

      const task: DailyTask = {
        day: dayNumber,
        description: cleanDescription,
        completed: false,
      };
      currentObjective.dailyTasks.push(task);
      seenTasks.push(cleanDescription);
      totalTasksFound++;

      continue;
    }

    // Optional: append unmatched lines to the last task as a multi-line description
    // if (currentObjective && currentObjective.dailyTasks.length > 0 && /^[a-zA-Z]/.test(trimmedLine)) {
    //   const lastTask = currentObjective.dailyTasks[currentObjective.dailyTasks.length - 1];
    //   lastTask.description += '\n' + trimmedLine;
    // }
  }

  // Validate task count matches expected duration
  if (expectedDuration && !isStreaming) {
    if (totalTasksFound !== expectedDuration) {
      console.warn(`Task count mismatch: found ${totalTasksFound}, expected ${expectedDuration}`);
      // For non-streaming, allow some flexibility since we filter duplicates
      if (totalTasksFound < expectedDuration * 0.7) {
        // Too many missing tasks (less than 70% of expected), return null for retry
        console.error(`Too few unique tasks: ${totalTasksFound}/${expectedDuration}`);
        return null;
      }
      // Allow plans with reasonable number of unique tasks
    }
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

  // Cache successful parses
  if (!isStreaming) {
    const cacheKey = getCacheKey(rawPlanString, userGoal, expectedDuration, isStreaming);
    setCache(cacheKey, plan);
  }

  return plan;
};