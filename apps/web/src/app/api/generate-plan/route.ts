import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL_NAME = 'gemini-2.5-flash';

const GEMINI_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,
  thinkingConfig: {
    includeThoughts: false,
    thinkingBudget: 2048,
  },
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  planGeneration: {
    temperature: 0.5,
    topK: 20,
    topP: 0.9,
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
    // 7-day sprint: 1 week
    structureDescription = `
# Goal: [Restate the User's Goal Here]

## Week 1: [Sprint Objective - What will be accomplished this week]
- Day 1: [Specific, actionable task for Day 1]
- Day 2: [Specific, actionable task for Day 2]
- Day 3: [Specific, actionable task for Day 3]
- Day 4: [Specific, actionable task for Day 4]
- Day 5: [Specific, actionable task for Day 5]
- Day 6: [Specific, actionable task for Day 6]
- Day 7: [Specific, actionable task for Day 7]`;
    totalWeeks = 1;
  } else if (planDuration === 30) {
    // 30-day month: 4 weeks, 1 month
    structureDescription = `
# Goal: [Restate the User's Goal Here]

## Month 1: [Monthly Milestone - Major accomplishment for this month]
### Week 1: [Weekly objective for Week 1]
- Day 1: [Specific, actionable task for Day 1]
- Day 2: [Specific, actionable task for Day 2]
- Day 3: [Specific, actionable task for Day 3]
- Day 4: [Specific, actionable task for Day 4]
- Day 5: [Specific, actionable task for Day 5]
- Day 6: [Specific, actionable task for Day 6]
- Day 7: [Specific, actionable task for Day 7]
### Week 2: [Weekly objective for Week 2]
- Day 1: [Task...]
... (Repeat for all 7 days)
### Week 3: [Weekly objective for Week 3]
... (Repeat for all 7 days)
### Week 4: [Weekly objective for Week 4]
... (Repeat for all 7 days)`;
    totalMonths = 1;
    totalWeeks = 4;
  } else if (planDuration === 90) {
    // 90-day quarter: 12 weeks, 3 months (original structure)
    structureDescription = `
# Goal: [Restate the User's Goal Here]

## Month 1: [Monthly milestone for Month 1]
### Week 1: [Weekly objective for Week 1 of Month 1]
- Day 1: [Specific, actionable task for Day 1]
- Day 2: [Specific, actionable task for Day 2]
- Day 3: [Specific, actionable task for Day 3]
- Day 4: [Specific, actionable task for Day 4]
- Day 5: [Specific, actionable task for Day 5]
- Day 6: [Specific, actionable task for Day 6]
- Day 7: [Specific, actionable task for Day 7]
### Week 2: [Weekly objective for Week 2 of Month 1]
- Day 1: [Task...]
... (Repeat for all 7 days)
### Week 3: [Weekly objective for Week 3 of Month 1]
... (Repeat for all 7 days)
### Week 4: [Weekly objective for Week 4 of Month 1]
... (Repeat for all 7 days)

## Month 2: [Monthly milestone for Month 2]
### Week 1: [Weekly objective for Week 1 of Month 2]
... (Repeat structure for 4 weeks and 7 days/week)

## Month 3: [Monthly milestone for Month 3]
### Week 1: [Weekly objective for Week 1 of Month 3]
... (Repeat structure for 4 weeks and 7 days/week)`;
    totalMonths = 3;
    totalWeeks = 12;
  } else {
    // Custom duration - calculate months and weeks dynamically
    const totalWeeksNeeded = Math.ceil(planDuration / daysPerWeek);
    totalMonths = Math.ceil(totalWeeksNeeded / weeksPerMonth);
    totalWeeks = totalWeeksNeeded;

    structureDescription = `
# Goal: [Restate the User's Goal Here]`;

    for (let month = 1; month <= totalMonths; month++) {
      structureDescription += `

## Month ${month}: [Monthly milestone for Month ${month}]`;
      const weeksInMonth = month === totalMonths ? (totalWeeks - (month - 1) * weeksPerMonth) : weeksPerMonth;

      for (let week = 1; week <= weeksInMonth; week++) {
        structureDescription += `
### Week ${(month - 1) * weeksPerMonth + week}: [Weekly objective for Week ${(month - 1) * weeksPerMonth + week}]
- Day 1: [Specific, actionable task for Day 1]
- Day 2: [Specific, actionable task for Day 2]
- Day 3: [Specific, actionable task for Day 3]
- Day 4: [Specific, actionable task for Day 4]
- Day 5: [Specific, actionable task for Day 5]
- Day 6: [Specific, actionable task for Day 6]
- Day 7: [Specific, actionable task for Day 7]`;
      }
    }
  }

  const durationContext = duration ?
    `This is a ${planDuration}-day plan. Create a realistic, achievable plan for exactly ${planDuration} days.` :
    'Create a comprehensive 90-day plan.';

  return `You are an expert project planner. Create a detailed, actionable plan to achieve the following goal:

"${goal}"

${durationContext} The plan should be specifically tailored for a ${planDuration}-day timeframe and include realistic, achievable milestones that build progressively toward the goal.

Structure the plan rigorously using the following Markdown format:
${structureDescription}

IMPORTANT REQUIREMENTS:
- Every day within the plan must have a specific, actionable task assigned
- Tasks should be realistic and achievable within the ${planDuration}-day timeframe
- Use the exact headings and structure shown above
- Ensure the plan builds progressively from foundational tasks to advanced achievements
- Make tasks specific and measurable with clear completion criteria
- Consider the user's selected timeframe (${planDuration} days) when determining task complexity and pacing

Use the exact headings (# Goal:, ## Month <number>:, ### Week <number>:, - Day <number>:) as shown.`;
}


