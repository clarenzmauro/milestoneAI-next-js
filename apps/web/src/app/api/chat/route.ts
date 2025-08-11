import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL_NAME = 'gemini-2.5-flash-lite';

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
  chatGeneration: {
    temperature: 0.8,
    topK: 50,
    topP: 0.95,
    thinkingBudget: 24576,
  },
};

type GeminiHistoryItem = { role: 'user' | 'model'; parts: string };

// Simple in-memory rate limiter storage (per server instance)
const ipRateMap: Map<string, { tokens: number; lastRefillMs: number }> = (globalThis as any).__chatRateMap || new Map();
(globalThis as any).__chatRateMap = ipRateMap;

/**
 * @description
 * Extracts best-effort client IP from request headers for rate limiting.
 *
 * @receives data from:
 * - route.ts; POST: NextRequest with headers
 *
 * @sends data to:
 * - route.ts; POST: Caller uses returned IP string for rate limiting key
 *
 * @sideEffects:
 * - None
 */
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  const xri = req.headers.get('x-real-ip');
  return (xff?.split(',')[0]?.trim() || xri || 'unknown');
}

/**
 * @description
 * Token bucket rate limiter keyed by IP and route. Defaults to 60 req/min with a burst of 30.
 *
 * @receives data from:
 * - route.ts; POST: Client IP and unique bucket key
 *
 * @sends data to:
 * - route.ts; POST: Boolean indicating whether the request is allowed
 *
 * @sideEffects:
 * - Mutates in-memory token buckets for the process
 */
function rateLimit(bucketKey: string, limitPerMinute = 60, burst = 30): boolean {
  const now = Date.now();
  const existing = ipRateMap.get(bucketKey);
  const refillRatePerMs = limitPerMinute / 60000; // tokens per ms
  if (!existing) {
    ipRateMap.set(bucketKey, { tokens: burst - 1, lastRefillMs: now });
    return true;
  }
  const elapsed = Math.max(0, now - existing.lastRefillMs);
  const refilled = existing.tokens + elapsed * refillRatePerMs;
  const tokens = Math.min(burst, refilled);
  if (tokens < 1) {
    existing.tokens = tokens;
    existing.lastRefillMs = now;
    return false;
  }
  existing.tokens = tokens - 1;
  existing.lastRefillMs = now;
  return true;
}

/**
 * @description
 * Chat endpoint that streams or returns a full AI response. If a plan is included, the
 * system prompt enforces an updated plan format when needed.
 *
 * @receives data from:
 * - aiService.ts; chatWithAI: message, history, and optional plan
 *
 * @sends data to:
 * - aiService.ts; chatWithAI: streamed text or full response text
 *
 * @sideEffects:
 * - Network calls to Google Generative AI
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req);
  const bucketKey = `chat:${ip}`;
  if (!rateLimit(bucketKey)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }), { status: 500 });
  }

  const { message, history, plan } = await req.json();
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required.' }), { status: 400 });
  }
  // Basic payload limits
  if (message.length > 8000) {
    return new Response(JSON.stringify({ error: 'Message too long.' }), { status: 413 });
  }
  if (Array.isArray(history) && history.length > 50) {
    return new Response(JSON.stringify({ error: 'History too long.' }), { status: 413 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  let systemPrompt = 'You are a helpful assistant. Answer the user\'s questions.';
  if (plan) {
    try {
      const planString = JSON.stringify(plan, null, 2);
      systemPrompt = `You are an AI assistant supporting a user with their 90-day plan.\nCONTEXT:\nHere is their current plan structure:\n${planString}\n\nTASK:\nReview the user's latest message in the context of the chat history and the provided plan.\n1. If the user is asking a question, seeking advice, or making a comment that DOES NOT require changing the plan structure: Respond conversationally.\n2. If the user explicitly asks to modify the plan, change focus, add/remove items, or otherwise requests a structural update: Your response MUST contain ONLY the complete, revised 90-day plan. ABSOLUTELY NO other text, introductions, explanations, or confirmations are allowed before or after the plan. The response MUST start directly with "# Goal:" and follow the precise Markdown structure shown below. Ensure every day has a task.\n\nREQUIRED MARKDOWN FORMAT:\n# Goal: [New Goal Title]\n\n## Month 1: [Milestone Title]\n### Week 1: [Objective Title]\n- Day 1: [Task Description]\n- Day 2: [Task Description]\n...\n(Repeat for all months, weeks, and days)\n\nFAILURE TO FOLLOW THIS FORMAT WILL BREAK THE APPLICATION. Output ONLY the Markdown plan.`;
    } catch {
      systemPrompt = 'You are a helpful assistant. The user has a 90-day plan, but it could not be formatted for context.';
    }
  }

  const formattingReminder = `\n\n[SYSTEM REMINDER: If you are updating the plan based on this message, your response MUST be ONLY the complete, revised plan in the required Markdown format, starting directly with "# Goal:". NO other text is allowed.]`;
  const userMessage = plan ? message + formattingReminder : message;

  const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}`;

  const useChatHistory = Array.isArray(history) && history.length > 0 && history[0].role === 'user';

  let finalContent = '';
  try {
    if (useChatHistory) {
      const formattedHistory = (history as GeminiHistoryItem[]).map((h) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.parts }],
      }));
      const chat: any = (model as any).startChat({ history: formattedHistory });
      const result = await chat.sendMessage(userMessage, {
        generationConfig: {
          temperature: GEMINI_CONFIG.chatGeneration.temperature,
          topK: GEMINI_CONFIG.chatGeneration.topK,
          topP: GEMINI_CONFIG.chatGeneration.topP,
          maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
          frequencyPenalty: GEMINI_CONFIG.frequencyPenalty,
          presencePenalty: GEMINI_CONFIG.presencePenalty,
        },
      });
      finalContent = (await result.response).text();
    } else {
      const result: any = await (model as any).generateContent(fullPrompt, {
        generationConfig: {
          temperature: GEMINI_CONFIG.chatGeneration.temperature,
          topK: GEMINI_CONFIG.chatGeneration.topK,
          topP: GEMINI_CONFIG.chatGeneration.topP,
          maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
          frequencyPenalty: GEMINI_CONFIG.frequencyPenalty,
          presencePenalty: GEMINI_CONFIG.presencePenalty,
        },
      });
      finalContent = (await result.response).text();
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to get chat response from AI service.' }), { status: 500 });
  }

  if (plan && typeof finalContent === 'string' && finalContent.includes('# Goal:')) {
    const idx = finalContent.indexOf('# Goal:');
    if (idx !== -1) {
      const extracted = finalContent.substring(idx);
      if (extracted.includes('## Month') && extracted.includes('### Week')) {
        finalContent = extracted;
      }
    }
  }

  return new Response(finalContent ?? '', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}


