import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL_NAME = 'gemini-2.5-flash';

const GEMINI_CONFIG = {
  temperature: 0.3,
  topK: 20,
  topP: 0.8,
  maxOutputTokens: 2048,
};

/**
 * @description
 * Validates if a goal is actionable and provides suggestions for improvement.
 * Considers the timeframe context when validating goal achievability.
 *
 * @receives data from:
 * - goal-page.tsx; validateGoal: Goal string and optional duration to validate
 *
 * @sends data to:
 * - goal-page.tsx; validateGoal: JSON response with validation result and suggestions
 *
 * @sideEffects:
 * - Network calls to Google Generative AI
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }), { status: 500 });
  }

  const { goal, duration, currentDateTime } = await req.json().catch(() => ({ goal: '', duration: null, currentDateTime: null }));
  if (!goal || typeof goal !== 'string') {
    return new Response(JSON.stringify({ error: 'Goal is required in the request body.' }), { status: 400 });
  }

  if (goal.length > 1000) {
    return new Response(JSON.stringify({ error: 'Goal is too long.' }), { status: 413 });
  }

  try {
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

    const prompt = createValidationPrompt(goal, duration || undefined, currentDateTime);

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Clean up the response - Gemini sometimes wraps JSON in markdown code blocks
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response from Gemini
    const validationResult = JSON.parse(text);

    return new Response(JSON.stringify(validationResult), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Goal validation error:', err);
    return new Response(JSON.stringify({
      error: 'Failed to validate goal. Please try again.',
      isValid: false,
      suggestions: []
    }), { status: 500 });
  }
}

/**
 * @description
 * Builds the validation prompt for goal assessment with strict timeframe enforcement.
 *
 * @receives data from:
 * - route.ts; POST: goal string, duration, and current date/time context
 *
 * @sends data to:
 * - Google Generative AI; generateContent: timeframe-specific validation prompt
 *
 * @sideEffects:
 * - None
 */
function createValidationPrompt(goal: string, duration?: number, currentDateTime?: any): string {
  let timeframeContext = '';
  let timeframeGuidance = '';

  if (duration) {
    // Provide specific guidance based on timeframe
    if (duration === 7) {
      timeframeContext = `This is a 7-day quick sprint. Goals must be achievable within ONE WEEK.`;
      timeframeGuidance = `
7-DAY SPRINT GUIDELINES:
- Focus on immediate, actionable tasks
- Small, measurable wins within 7 days
- Examples: "Complete 3 blog posts", "Learn basic React components", "Run 5km daily for 7 days"
- Reject: Long-term projects, major lifestyle changes, complex learning paths`;
    } else if (duration === 30) {
      timeframeContext = `This is a 30-day focused month. Goals must be achievable within ONE MONTH.`;
      timeframeGuidance = `
30-DAY MONTH GUIDELINES:
- Medium-term projects with clear milestones
- Build sustainable habits or complete focused projects
- Examples: "Build a portfolio website", "Read 4 books", "Lose 5 pounds with diet + exercise"
- Reject: Major career changes, complex products, multi-month transformations`;
    } else if (duration === 90) {
      timeframeContext = `This is a 90-day quarterly plan. Goals must be achievable within THREE MONTHS.`;
      timeframeGuidance = `
90-DAY QUARTERLY GUIDELINES:
- Significant projects with multiple phases
- Transformative goals requiring consistent effort
- Examples: "Launch SaaS MVP", "Master a new technology stack", "Build a business from scratch"
- Reject: Overly ambitious goals, career pivots requiring 6+ months`;
    } else {
      timeframeContext = `This is a ${duration}-day custom timeframe. Goals must be realistically achievable within exactly ${duration} days.`;
      timeframeGuidance = `
CUSTOM TIMEFRAME GUIDELINES:
- Scale goal complexity proportionally to available days
- Ensure milestones fit within the exact timeframe
- For ${duration} days: ${duration < 14 ? 'Focus on quick wins and skill acquisition' : duration < 60 ? 'Medium projects with clear deliverables' : 'Major initiatives with multiple milestones'}`;
    }
  }

  // Include current date/time context for more relevant suggestions
  const dateTimeContext = currentDateTime ? `
Current context: Today is ${currentDateTime.dayOfWeek}, ${currentDateTime.month} ${currentDateTime.date}, ${currentDateTime.year}.
Current time: ${currentDateTime.time} (${currentDateTime.timestamp}).
Consider seasonal factors, current month, and time of year when providing suggestions.` : '';

  return `You are an expert goal-setting coach. Analyze the following goal and provide a JSON response with validation and suggestions.

Goal to analyze: "${goal}"
${timeframeContext}${dateTimeContext}

IMPORTANT: Respond with ONLY a valid JSON object in this exact format. Do NOT include any markdown formatting, code blocks, or additional text:

{
  "isValid": boolean,
  "confidence": number,
  "feedback": "string",
  "suggestions": ["string1", "string2", "string3"],
  "category": "string"
}

STRICT TIMEFRAME REQUIREMENTS:
${timeframeGuidance}

Validation guidelines:
- Valid goals MUST be realistically achievable within the specified timeframe
- Goals must be specific, measurable, achievable, relevant, and time-bound (SMART criteria)
- REJECT goals that are inappropriate for the timeframe (e.g., "learn 5 programming languages" in 7 days)
- Consider current date/time context for seasonal relevance

Examples by timeframe:
7 DAYS: "Write and publish 2 blog posts", "Complete React tutorial and build 1 app", "Establish morning meditation habit"
30 DAYS: "Launch personal website with 5 pages", "Read 3 technical books", "Complete online course certification"
90 DAYS: "Build and deploy full-stack web app", "Master data science fundamentals", "Start profitable side business"

Field explanations:
- isValid: true if the goal meets SMART criteria AND fits the specified timeframe
- confidence: score from 0-100 about goal quality and timeframe appropriateness
- feedback: brief explanation (max 100 chars) including timeframe assessment
- suggestions: up to 3 improved goal suggestions that FIT the exact timeframe, or empty array if goal is good
- category: one of "career", "health", "learning", "personal", "business", "creative", "financial", "relationships", "other"

REJECT inappropriate goals: If goal cannot realistically be achieved in timeframe, set isValid=false with low confidence and provide timeframe-appropriate alternatives.`;
}
