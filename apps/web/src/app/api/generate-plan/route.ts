import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL_NAME = 'gemini-flash-latest';

const GEMINI_CONFIG = {
  temperature: 0.6,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,
  thinkingConfig: {
    includeThoughts: false,
    thinkingBudget: 24576,
  },
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  planGeneration: {
    temperature: 0.6,
    topK: 40,
    topP: 0.95,
    thinkingBudget: 24576,
  },
};

/**
 * @description
 * Streams a generated 90-day plan using Gemini with strict Markdown format.
 *
 * @receives data from:
 * - aiService.ts; generatePlan: Goal string to plan for
 *
 * @sends data to:
 * - aiService.ts; generatePlan: Streamed text chunks of the plan
 *
 * @sideEffects:
 * - Network calls to Google Generative AI
 */
export async function POST(req: NextRequest) {
  // Basic in-memory rate limit per IP for plan generation
  const ipRateMap: Map<string, { tokens: number; lastRefillMs: number }> = (globalThis as any).__planRateMap || new Map();
  (globalThis as any).__planRateMap = ipRateMap;
  const xff = req.headers.get('x-forwarded-for');
  const xri = req.headers.get('x-real-ip');
  const ip = (xff?.split(',')[0]?.trim() || xri || 'unknown');
  const now = Date.now();
  const key = `plan:${ip}`;
  const limitPerMinute = 20;
  const burst = 10;
  const refillRatePerMs = limitPerMinute / 60000;
  const existing = ipRateMap.get(key);
  if (!existing) {
    ipRateMap.set(key, { tokens: burst - 1, lastRefillMs: now });
  } else {
    const elapsed = Math.max(0, now - existing.lastRefillMs);
    const refilled = existing.tokens + elapsed * refillRatePerMs;
    const tokens = Math.min(burst, refilled);
    if (tokens < 1) {
      existing.tokens = tokens;
      existing.lastRefillMs = now;
      return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    existing.tokens = tokens - 1;
    existing.lastRefillMs = now;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }), { status: 500 });
  }

  const { goal, duration } = await req.json().catch(() => ({ goal: '', duration: undefined }));
  if (!goal || typeof goal !== 'string') {
    return new Response(JSON.stringify({ error: 'Goal is required in the request body.' }), { status: 400 });
  }
  if (goal.length > 4000) {
    return new Response(JSON.stringify({ error: 'Goal is too long.' }), { status: 413 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: GEMINI_CONFIG.temperature,
      topK: GEMINI_CONFIG.topK,
      topP: GEMINI_CONFIG.topP,
      maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
    },
  });

  const prompt = createPlanPrompt(goal, duration);

  const stream = new ReadableStream<Uint8Array>({
    /**
     * @description
     * Streams chunks from Gemini to the HTTP client.
     *
     * @receives data from:
     * - route.ts; POST: prompt and model stream iterator
     *
     * @sends data to:
     * - aiService.ts; generatePlan: reads text chunks
     *
     * @sideEffects:
     * - None beyond network IO
     */
    async start(controller) {
      try {
        const result: any = await (model as any).generateContentStream(prompt, {
          generationConfig: {
            temperature: GEMINI_CONFIG.planGeneration.temperature,
            topK: GEMINI_CONFIG.planGeneration.topK,
            topP: GEMINI_CONFIG.planGeneration.topP,
            maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
            frequencyPenalty: GEMINI_CONFIG.frequencyPenalty,
            presencePenalty: GEMINI_CONFIG.presencePenalty,
          },
        });

        const encoder = new TextEncoder();
        for await (const chunk of result.stream) {
          const text = chunk.text?.();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (err: any) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
      'X-Robots-Tag': 'noindex',
    },
  });
}

/**
 * @description
 * Builds the strict Markdown plan prompt using the user's goal.
 *
 * @receives data from:
 * - route.ts; POST: goal string from request
 *
 * @sends data to:
 * - Google Generative AI; generateContentStream: prompt string
 *
 * @sideEffects:
 * - None
 */
function createPlanPrompt(goal: string, duration?: number): string {
  // Default to 90 days if no duration specified
  const planDuration = duration || 90;

  // Calculate structure based on duration
  const daysPerWeek = 7;
  const weeksPerMonth = 4;

  let structureDescription = '';
  let totalMonths = 0;
  let totalWeeks = 0;

  if (planDuration === 7) {
    // 7-day sprint: 1 week, exactly 7 tasks
    structureDescription = `# Goal: ${goal}

## Week 1: [One-sentence objective for this 7-day sprint]
- Day 1: [Actionable task for day 1]
- Day 2: [Actionable task for day 2]
- Day 3: [Actionable task for day 3]
- Day 4: [Actionable task for day 4]
- Day 5: [Actionable task for day 5]
- Day 6: [Actionable task for day 6]
- Day 7: [Actionable task for day 7]`;
    totalWeeks = 1;
  } else if (planDuration === 30) {
    // 30-day month: 4 weeks, exactly 30 tasks
    structureDescription = `# Goal: ${goal}

## Month 1: [One-sentence milestone for this month]
### Week 1: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 2: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 3: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 4: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]`;
    totalMonths = 1;
    totalWeeks = 4;
  } else if (planDuration === 90) {
    // 90-day quarter: 12 weeks, 3 months, exactly 90 tasks
    structureDescription = `# Goal: ${goal}

## Month 1: [Monthly milestone]
### Week 1: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 2: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 3: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 4: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]

## Month 2: [Monthly milestone]
### Week 5: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 6: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 7: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 8: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]

## Month 3: [Monthly milestone]
### Week 9: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 10: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 11: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]
### Week 12: [Weekly objective]
- Day 1: [Task]
- Day 2: [Task]
- Day 3: [Task]
- Day 4: [Task]
- Day 5: [Task]
- Day 6: [Task]
- Day 7: [Task]`;
    totalMonths = 3;
    totalWeeks = 12;
  } else {
    // Custom duration - calculate months and weeks dynamically
    const totalWeeksNeeded = Math.ceil(planDuration / daysPerWeek);
    totalMonths = Math.ceil(totalWeeksNeeded / weeksPerMonth);
    totalWeeks = totalWeeksNeeded;

    structureDescription = `# Goal: ${goal}`;

    for (let month = 1; month <= totalMonths; month++) {
      structureDescription += `

## Month ${month}: [Monthly milestone for Month ${month}]`;
      const weeksInMonth = month === totalMonths ? (totalWeeks - (month - 1) * weeksPerMonth) : weeksPerMonth;

      for (let week = 1; week <= weeksInMonth; week++) {
        const globalWeekNum = (month - 1) * weeksPerMonth + week;
        structureDescription += `
### Week ${globalWeekNum}: [Weekly objective for Week ${globalWeekNum}]
- Day 1: [Specific actionable task for Day 1]
- Day 2: [Specific actionable task for Day 2]
- Day 3: [Specific actionable task for Day 3]
- Day 4: [Specific actionable task for Day 4]
- Day 5: [Specific actionable task for Day 5]
- Day 6: [Specific actionable task for Day 6]
- Day 7: [Specific actionable task for Day 7]`;
      }
    }
  }

  const durationContext = duration ?
    `This is a ${planDuration}-day plan. Create exactly ${planDuration} specific, actionable tasks - one for each day.` :
    'Create a comprehensive 90-day plan with exactly 90 specific, actionable tasks.';

  return `You are an expert project planner. Create EXACTLY ${planDuration} UNIQUE, sequential daily tasks to achieve this goal:

GOAL: "${goal}"

${durationContext}

CRITICAL REQUIREMENTS:
- Generate exactly ${planDuration} COMPLETELY DIFFERENT tasks (no duplicates, no similarities)
- Each task must target a different aspect, skill, or approach
- Progress from beginner basics to advanced mastery
- Use different methods, tools, perspectives, and angles for each task

PHASE BREAKDOWN - Distribute tasks across these phases:
1. FOUNDATION (${Math.floor(planDuration * 0.25)} tasks): Research, planning, basic concepts
2. BUILDING (${Math.floor(planDuration * 0.30)} tasks): Core skills, initial implementation
3. ADVANCEMENT (${Math.floor(planDuration * 0.25)} tasks): Deeper practice, refinement
4. MASTERY (${Math.floor(planDuration * 0.20)} tasks): Advanced techniques, optimization

UNIQUENESS STRATEGIES - For each task, vary by:
- Different skills/techniques to practice
- Different tools/resources to use
- Different perspectives or approaches
- Different contexts or scenarios
- Different depths of complexity
- Different time allocations or intensities

TASK VARIATION EXAMPLES:
Instead of multiple "practice X" tasks, create:
- Study X fundamentals
- Apply X in a simple project
- Teach X concepts to others
- Analyze expert X implementations
- Create X documentation
- Debug X issues
- Optimize X performance
- Integrate X with other tools

FORMATTING: Use EXACTLY this structure:

${structureDescription}

VALIDATION CHECKLIST:
□ Exactly ${planDuration} unique tasks (count them)
□ No two tasks are similar or could be considered the same activity
□ Each task has a different focus/skill/technique
□ Tasks progress logically from basic to advanced
□ All tasks are specific and actionable

OUTPUT: Only the formatted structure above, no extra text or explanations.`;
}


