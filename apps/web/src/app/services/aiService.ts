import type { FullPlan } from '../types/planTypes';

// Use Next.js API routes under /api
const BACKEND_URL = '/api';

/**
 * @description
 * Reusable fetch helper for backend API calls. Adds headers, JSON body, status checks, and parsing.
 *
 * @receives data from:
 * - aiService.ts; generatePlan/chatWithAI: Endpoint and payload for POST
 *
 * @sends data to:
 * - Next.js API routes under `/api`: Executes POST request and returns JSON
 *
 * @sideEffects:
 * - Network request
 */
async function _fetchAPI<T>(endpoint: string, body: object): Promise<T> {
  const url = `${BACKEND_URL}/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // Attempt to parse JSON regardless of status to potentially get error details
  let data;
  try {
    data = await response.json();
  } catch (jsonError) {
    // If JSON parsing fails AND status is bad, throw based on status
    if (!response.ok) {
      throw new Error(`Backend Error: ${response.status} ${response.statusText} at ${url}`);
    }
    // If JSON parsing fails but status is ok, something else is wrong
    throw new Error(`Failed to parse JSON response from ${url}, status: ${response.status}`);
  }

  if (!response.ok) {
    // Use error message from backend if available, otherwise use status text
    throw new Error(data?.error || `Backend Error: ${response.status} ${response.statusText} at ${url}`);
  }

  return data;
}

/**
 * @description
 * Validates a goal and provides suggestions for improvement with current date/time context.
 *
 * @receives data from:
 * - goal-page.tsx; handleGoalValidation: Goal string and optional duration to validate
 *
 * @sends data to:
 * - api/validate-goal/route.ts; POST: Goal validation request with current date/time context for enhanced AI suggestions
 *
 * @sideEffects:
 * - Network request to validate goal with contextual AI analysis
 */
export async function validateGoal(goal: string, duration?: number): Promise<{
  isValid: boolean;
  confidence: number;
  feedback: string;
  suggestions: string[];
  category: string;
}> {
  // Include current date/time context for better AI suggestions
  const currentDate = new Date();
  const currentDateTime = {
    date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
    time: currentDate.toTimeString().split(' ')[0], // HH:MM:SS format
    dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
    month: currentDate.toLocaleDateString('en-US', { month: 'long' }),
    year: currentDate.getFullYear(),
    timestamp: currentDate.toISOString()
  };

  return _fetchAPI('/validate-goal', {
    goal,
    duration,
    currentDateTime
  });
}

// Function to generate the initial 90-day plan via backend proxy with streaming
/**
 * @description
 * Requests a streamed 90-day plan from backend and returns the full concatenated text.
 *
 * @receives data from:
 * - contexts/PlanContext.tsx; generateNewPlan: Goal string and optional onChunk callback
 *
 * @sends data to:
 * - api/generate-plan route: Initiates streaming plan generation
 *
 * @sideEffects:
 * - Network streaming; invokes onChunk callback for UI updates
 */
export const generatePlan = async (
  goal: string,
  duration?: number,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  
  const url = `${BACKEND_URL}/generate-plan`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ goal, duration }),
  });

  if (!response.ok) {
    // For streaming endpoints, try to get error from response body
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || `Backend Error: ${response.status} ${response.statusText}`);
    } catch {
      throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
    }
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) {
    throw new Error("No response stream available");
  }

  let fullContent = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      
      // Call the chunk callback if provided
      if (onChunk) {
        onChunk(chunk);
      }
    }
    
    return fullContent;
    
  } catch (error) {
    console.error("[Client] Error during plan streaming:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to generate plan via backend: ${errorMessage}`);
  } finally {
    reader.releaseLock();
  }
};

// NOTE: Ensure this history type matches exactly what the backend expects.
type GeminiHistoryItem = { role: 'user' | 'model'; parts: string };

// Function for chat interactions via backend proxy with streaming
/**
 * @description
 * Sends a chat message and relevant history/plan to backend, streams and returns the full response.
 *
 * @receives data from:
 * - components/layout/Sidebar.tsx; handleChatOrRefinement: message, history, plan, and onChunk
 *
 * @sends data to:
 * - api/chat route: Initiates streaming chat response
 *
 * @sideEffects:
 * - Network streaming; invokes onChunk callback for UI updates
 */
export const chatWithAI = async (
  message: string,
  history: GeminiHistoryItem[], 
  plan: FullPlan | null,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  
  const url = `${BACKEND_URL}/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history,
      plan
    }),
  });

  if (!response.ok) {
    // For streaming endpoints, try to get error from response body
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || `Backend Error: ${response.status} ${response.statusText}`);
    } catch {
      throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
    }
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) {
    throw new Error("No response stream available");
  }

  let fullContent = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      
      // Call the chunk callback if provided
      if (onChunk) {
        onChunk(chunk);
      }
    }
    
    return fullContent;
    
  } catch (error) {
    console.error("[Client] Error during chat streaming:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get chat response via backend: ${errorMessage}`);
  } finally {
    reader.releaseLock();
  }
};
