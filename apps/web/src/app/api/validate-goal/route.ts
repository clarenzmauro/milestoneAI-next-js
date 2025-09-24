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

  const { goal, duration } = await req.json().catch(() => ({ goal: '', duration: null }));
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

    const prompt = createValidationPrompt(goal, duration || undefined);

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
 * Builds the validation prompt for goal assessment.
 *
 * @receives data from:
 * - route.ts; POST: goal string from request
 *
 * @sends data to:
 * - Google Generative AI; generateContent: prompt string
 *
 * @sideEffects:
 * - None
 */
function createValidationPrompt(goal: string, duration?: number): string {
  const timeframeContext = duration ? `This goal should be achievable within ${duration} days.` : '';

  return `You are an expert goal-setting coach. Analyze the following goal and provide a JSON response with validation and suggestions.

Goal to analyze: "${goal}"
${timeframeContext}

IMPORTANT: Respond with ONLY a valid JSON object in this exact format. Do NOT include any markdown formatting, code blocks, or additional text:

{
  "isValid": boolean,
  "confidence": number,
  "feedback": "string",
  "suggestions": ["string1", "string2", "string3"],
  "category": "string"
}

Guidelines for validation:
- Valid goals are specific, measurable, achievable, relevant, and time-bound (SMART criteria)
- Invalid examples: "be happy", "make money", "get fit", "learn stuff"
- Valid examples: "lose 10 pounds in 3 months by exercising 3x/week", "launch a mobile app MVP in 6 months", "learn React by building 5 projects"

Field explanations:
- isValid: true if the goal meets SMART criteria
- confidence: score from 0-100 about goal quality
- feedback: brief explanation (max 100 chars)
- suggestions: up to 3 improved goal suggestions, or empty array if goal is good
- category: one of "career", "health", "learning", "personal", "business", "creative", "financial", "relationships", "other"

Keep suggestions concise and actionable. If the goal is already good, set suggestions to empty array.`;
}
