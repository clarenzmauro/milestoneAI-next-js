import React, { useState, useEffect, useRef, useCallback } from 'react';
// Tailwind classes inlined; CSS module removed
import ConversationUI from '../sidebar/ConversationUI';
import { chatWithAI } from '../../services/aiService';
import { usePlan } from '../../contexts/PlanContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import SavedPlansModal from '../modals/SavedPlansModal';
import type { FullPlan } from '../../types/planTypes';
import type { ChatMessage } from '../../types/chatTypes';

// Define initial message (will be created dynamically based on selected duration)
const createInitialMessage = (duration: number | null): ChatMessage => ({
  id: 'initial',
  role: 'ai',
  text: duration
    ? `Let's build your roadmap to success! What big goal are you aiming for in ${duration} days?`
    : "Let's build your roadmap to success! What big goal are you aiming for?"
});

/**
 * @description
 * Chat and controls sidebar with input, conversation stream, and plan actions. Collapsible.
 *
 * @receives data from:
 * - contexts/PlanContext.tsx; usePlan: Plan state, generators, and actions
 *
 * @sends data to:
 * - services/aiService.ts; chatWithAI: Sends chat/refinement requests
 * - contexts/PlanContext.tsx; generateNewPlan/setPlanFromString/saveCurrentPlan/resetPlanState: Plan ops
 * - components/modals/SavedPlansModal.tsx; SavedPlansModal: Open/close and load plans
 *
 * @sideEffects:
 * - Scrolls chat container on message updates
 */
const Sidebar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  const {
    plan,
    selectedDuration,
    isLoading: isPlanLoading,
    error: planError,
    generateNewPlan,
    setPlanFromString,
    setPlan,
    saveCurrentPlan,
    resetPlanState
  } = usePlan();

  // Clerk components handle auth in layout header; keep minimal here

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize messages when selectedDuration changes
  useEffect(() => {
    if (selectedDuration !== null) {
      setMessages([createInitialMessage(selectedDuration)]);
      setInputValue('');
      setError(null);
    }
  }, [selectedDuration]);

  // Reset messages when plan is cleared
  useEffect(() => {
    if (plan === null && selectedDuration !== null) {
      setMessages([createInitialMessage(selectedDuration)]);
      setInputValue('');
      setError(null);
    }
  }, [plan, selectedDuration]);

  const createNewUserMessage = useCallback((text: string): ChatMessage => ({
    id: Date.now(),
    role: 'user',
    text,
  }), []);

  /**
   * @description
   * Orchestrates plan generation flow and chat stream placeholder messaging.
   *
   * @receives data from:
   * - Sidebar.tsx; handleSend: User message and current chat history
   *
   * @sends data to:
   * - contexts/PlanContext.tsx; generateNewPlan: Triggers AI plan generation
   *
   * @sideEffects:
   * - Updates local chat state and streaming status
   */
  const handlePlanGeneration = useCallback(async (message: string, updatedMessages: ChatMessage[]) => {
    
    // Add a simple message indicating plan generation has started
    const loadingMessage: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: "I'm generating your 90-day plan now. You can watch it build up in real-time in the main content area!",
    };

    setMessages(prevMessages => [...prevMessages, loadingMessage]);
    setIsStreaming(true);

    try {
      // Generate the plan without showing streaming text in chat
      await generateNewPlan(message);
      
      setIsStreaming(false);

      // Add a final confirmation message after plan generation is complete
      const confirmationMessage: ChatMessage = {
        id: Date.now() + 2,
        role: 'ai',
        text: "Perfect! Your 90-day plan has been generated and appears in the main area. Feel free to ask me questions about it or request any changes!",
      };

      if (!planError) {
        setMessages(prevMessages => [...prevMessages, confirmationMessage]);
      }
    } catch (error) {
      setIsStreaming(false);
      // If there's an error, add an error message
      const errorMessage: ChatMessage = {
        id: Date.now() + 3,
        role: 'ai',
        text: "Sorry, I encountered an error while generating your plan. Please try again.",
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  }, [generateNewPlan, planError]);

  const prepareChatHistory = useCallback((updatedMessages: ChatMessage[]): { role: 'user' | 'model'; parts: string }[] =>
    updatedMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : ('model' as 'user' | 'model'),
      parts: msg.text,
    })).slice(0, -1)
  , []);

  /**
   * @description
   * Sends a chat/refinement message and streams model response; may update the plan.
   *
   * @receives data from:
   * - Sidebar.tsx; handleSend: User message and updated chat history
   *
   * @sends data to:
   * - services/aiService.ts; chatWithAI: Streams response
   * - contexts/PlanContext.tsx; setPlanFromString/saveCurrentPlan: Applies plan updates and persists
   *
   * @sideEffects:
   * - Updates chat state and may persist plan
   */
  const handleChatOrRefinement = useCallback(async (message: string, updatedMessages: ChatMessage[]) => {
    
    // Create a streaming AI message
    const streamingMessageId = Date.now() + 1;
    const initialAiMessage: ChatMessage = {
      id: streamingMessageId,
      role: 'ai',
      text: '',
    };

    // Add the initial empty AI message and start streaming
    setMessages(prevMessages => [...prevMessages, initialAiMessage]);
    setIsStreaming(true);

    try {
      const history = prepareChatHistory(updatedMessages);
      const aiResponseText = await chatWithAI(message, history, plan, (chunk: string) => {
        // Update the streaming message with each chunk
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === streamingMessageId 
              ? { ...msg, text: msg.text + chunk }
              : msg
          )
        );
      });
      
      setIsStreaming(false);

      // Check if this looks like a plan update (contains "# Goal:")
      if (plan && aiResponseText.includes('# Goal:')) {
        // For plan updates, we need to process the plan
        const success = await setPlanFromString(aiResponseText, plan?.goal);
        
        if (success) {
          // Replace the streaming message with a confirmation
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, text: "Great! I've updated your plan based on your request. Check the main content area to see the changes." }
                : msg
            )
          );
        }
        // If not successful, the streaming message already contains the raw response
      }
      // For regular chat, the streaming message already contains the response

      if (plan) {
        saveCurrentPlan();
      }
    } catch (error) {
      setIsStreaming(false);
      // If there's an error, replace the streaming message with an error message
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, text: "Sorry, I encountered an error. Please try again." }
            : msg
        )
      );
    }
  }, [prepareChatHistory, plan, setPlanFromString, saveCurrentPlan]);

  const handleError = useCallback((err: unknown) => {
    console.error("[Sidebar] Error during AI interaction:", err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    const aiErrorMessage: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: `Sorry, I encountered an error: ${errorMessage}`,
    };

    setMessages(prevMessages => [...prevMessages, aiErrorMessage]);
    setError(`Failed to get response. See chat for details.`);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading || isPlanLoading) return;

    setIsLoading(true);
    setError(null);

    const newUserMessage: ChatMessage = createNewUserMessage(trimmedMessage);
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue('');

    try {
      // If no plan exists and this is one of the first messages, generate a plan
      if (!plan && messages.length <= 2) {
        await handlePlanGeneration(trimmedMessage, updatedMessages);
      } else {
        await handleChatOrRefinement(trimmedMessage, updatedMessages);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputValue, isLoading, isPlanLoading, createNewUserMessage, messages,
    plan, handlePlanGeneration, handleChatOrRefinement, handleError
  ]);

  /**
   * @description
   * Loads a saved plan and optionally restores its chat history.
   *
   * @receives data from:
   * - components/modals/SavedPlansModal.tsx; onLoadPlan: Selected plan and optional history
   *
   * @sends data to:
   * - contexts/PlanContext.tsx; setPlan: Injects plan into context
   *
   * @sideEffects:
   * - Updates local chat state and modal visibility
   */
  const handleLoadPlan = useCallback((loadedData: { plan: FullPlan; chatHistory?: ChatMessage[] }) => {
    
    const loadedPlan = loadedData.plan;
    const loadedChatHistory = loadedData.chatHistory || [];

    setPlan(loadedPlan);

    if (loadedChatHistory.length > 0) {
      setMessages(loadedChatHistory);
    } else {
      setMessages([{ 
        id: Date.now(), 
        role: 'ai', 
        text: `Perfect! I've loaded your plan: "${loadedPlan.goal}". How can I help you refine it or discuss your progress?`
      }]);
    }

    setIsPlansModalOpen(false);
  }, [setPlan]);

  // Memoized handlers
  const handleOpenPlansModal = useCallback(() => {
    setIsPlansModalOpen(true);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCloseModal = useCallback(() => {
    setIsPlansModalOpen(false);
  }, []);

  return (
    <>
      <aside className={`w-[380px] h-screen bg-white flex flex-col transition-[width] duration-300 overflow-hidden border-r border-[var(--color-border,#E5E9ED)] ${isCollapsed ? 'w-[50px]' : ''}`}>
        <div className="flex justify-between items-center p-2.5 border-b border-[var(--color-border,#E5E9ED)] h-[50px] box-border">
          {/* Left Side: Title */}
          <div className="font-bold text-[1.1em] text-[var(--color-text-main,#1A1A1A)]">{!isCollapsed && 'MilestoneAI'}</div>

          {/* Right Side: Buttons */}
          <div className="flex items-center gap-2.5">
            {!isCollapsed && (
              <SignedIn>
                <>
                  <button
                    onClick={handleOpenPlansModal}
                    className="bg-[var(--color-background-light,#F5F7F9)] text-[var(--color-text-secondary,#666)] border border-[var(--color-border,#E5E9ED)] px-2.5 py-1 rounded text-[0.9em] hover:bg-[var(--color-border,#E5E9ED)]"
                    title="Saved Plans"
                  >
                    Plans
                  </button>
                  <button
                    onClick={resetPlanState}
                    className="bg-[var(--color-background-light,#F5F7F9)] text-[var(--color-text-secondary,#666)] border border-[var(--color-border,#E5E9ED)] px-2.5 py-1 rounded text-[0.9em] hover:bg-[var(--color-border,#E5E9ED)]"
                    title="New Plan"
                  >
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <line x1="7" y1="2.75" x2="7" y2="11.25"/>
                      <line x1="2.75" y1="7" x2="11.25" y2="7"/>
                    </svg>
                  </button>
                </>
              </SignedIn>
            )}

            {/* Collapse/Expand Button */}
            <div className="flex items-center gap-2">
            <button title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} onClick={handleToggleCollapse} className="bg-transparent border-0 p-1 text-[var(--color-text-secondary,#666)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                {isCollapsed ? (
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                ) : (
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                )}
              </svg>
            </button>
            <SignedOut>
              <SignInButton>
                <button className="px-2.5 py-1 rounded text-[0.9em] bg-[var(--color-background-light,#F5F7F9)] text-[var(--color-text-secondary,#666)] border border-[var(--color-border,#E5E9ED)] hover:bg-[var(--color-border,#E5E9ED)]">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            </div>
          </div>
        </div>

        {/* Main Content (only shown if not collapsed) */}
        {!isCollapsed && (
          <>
            <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-2.5" ref={chatContainerRef}>
              <ConversationUI messages={messages} isStreaming={isStreaming} />
              {(planError || error) && !isLoading && !isPlanLoading && (
                <div className="p-2.5 text-[#D8000C] bg-[#FFD2D2] border border-[#D8000C] rounded text-[13px] text-center mt-2.5">
                  {planError && `Plan Error: ${planError}`}
                  {error && `Error: ${error}`}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-[var(--color-border,#E5E9ED)]">
              <textarea
                className="w-full p-3 border border-[var(--color-border,#E5E9ED)] rounded-md text-[13px] resize-none min-h-[60px] bg-white mb-2.5 leading-6 focus:outline-none focus:border-[#4A90E2] focus:shadow-[0_0_0_2px_rgba(74,144,226,0.2)]"
                placeholder={plan ? "Ask me anything about your plan..." : "What's your 90-day goal?"}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                disabled={isLoading || isPlanLoading}
              />
              <div className="flex justify-end">
                <button
                  className="px-4 py-1.5 rounded text-[13px] font-medium bg-[#4A90E2] text-white hover:bg-[#357ABD] transition"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading || isPlanLoading}
                >
                  {isLoading ? 'Thinking...' : isPlanLoading ? 'Generating Plan...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      <SavedPlansModal
        isOpen={isPlansModalOpen}
        onClose={handleCloseModal}
        onLoadPlan={handleLoadPlan}
      />
    </>
  );
};

export default Sidebar;
