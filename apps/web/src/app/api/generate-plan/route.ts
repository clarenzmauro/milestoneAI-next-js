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

  const { goal } = await req.json().catch(() => ({ goal: '' }));
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

  const prompt = createPlanPrompt(goal);

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
          if (text) controller.enqueue(encoder.encode(text));
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
function createPlanPrompt(goal: string): string {
  return `You are an expert project planner. Create a detailed, actionable 90-day plan to achieve the following goal:

"${goal}"

Structure the plan rigorously using the following Markdown format:

# Goal: [Restate the User's Goal Here]

## Month 1: [Concise Milestone Title for Month 1]
### Week 1: [Objective Title for Week 1 of Month 1]
- Day 1: [Specific, actionable task for Day 1]
- Day 2: [Specific, actionable task for Day 2]
- Day 3: [Specific, actionable task for Day 3]
- Day 4: [Specific, actionable task for Day 4]
- Day 5: [Specific, actionable task for Day 5]
- Day 6: [Specific, actionable task for Day 6]
- Day 7: [Specific, actionable task for Day 7]
### Week 2: [Objective Title for Week 2 of Month 1]
- Day 1: [Task...]
... (Repeat for all 7 days)
### Week 3: [Objective Title for Week 3 of Month 1]
... (Repeat for all 7 days)
### Week 4: [Objective Title for Week 4 of Month 1]
... (Repeat for all 7 days)

## Month 2: [Concise Milestone Title for Month 2]
### Week 1: [Objective Title for Week 1 of Month 2]
... (Repeat structure for 4 weeks and 7 days/week)

## Month 3: [Concise Milestone Title for Month 3]
### Week 1: [Objective Title for Week 1 of Month 3]
... (Repeat structure for 4 weeks and 7 days/week)

Ensure every day within every week has a task assigned. Use the exact headings (# Goal:, ## Month <number>:, ### Week <number>:, - Day <number>:) as shown.`;
}


