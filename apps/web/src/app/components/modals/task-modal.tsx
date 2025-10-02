import { useState, useEffect, useRef } from "react";
import { FaCheck, FaTimes, FaRobot } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DailyTask, FullPlan } from "../../types/plan-types";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@milestoneAI-next-js/backend/convex/_generated/api";
import { usePlan } from "../../contexts/plan-context";
import { useUser } from "@clerk/nextjs";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask | null;
  plan: FullPlan | null;
  monthIndex: number;
  weekIndex: number;
  taskDay: number;
  onToggleComplete: (task: DailyTask) => void;
  onSendMessage: (
    message: string,
    task: DailyTask,
    plan: FullPlan
  ) => Promise<string>;
}

export default function TaskModal({
  isOpen,
  onClose,
  task,
  plan,
  monthIndex,
  weekIndex,
  taskDay,
  onToggleComplete,
  onSendMessage,
}: TaskModalProps) {
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { currentPlanId } = usePlan();
  const { user, isLoaded } = useUser();

  // Create unique task identifier: "month-week-day"
  const taskIdentifier = `${monthIndex}-${weekIndex}-${taskDay}`;

  const messagesPage = useQuery(
    api.chat.listMessages,
    currentPlanId ? { planId: currentPlanId, taskIdentifier } : "skip"
  );
  const messages = messagesPage?.page ?? [];
  const hasChatError = !messagesPage && currentPlanId !== null && isLoaded && user; // Error if we have a planId but no messagesPage and user is authenticated
  const isChatDisabled = Boolean(isLoading || currentPlanId === null || hasChatError || !isLoaded || (user === null));
  const appendMessage = useMutation(api.chat.appendMessage);
  const recomputeInsights = useAction(api.insights.recomputeInsightsForPlan);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || currentPlanId === null || isLoading) return;

    const userMessageContent = messageInput.trim();
    setMessageInput(""); // Clear input immediately

    // 1. Persist user message
    await appendMessage({
      planId: currentPlanId,
      taskIdentifier,
      role: "user",
      content: userMessageContent,
    });

    // 2. Call AI to get response
    setIsLoading(true);
    try {
      const response = await onSendMessage(userMessageContent, task!, plan!);

      // 3. Persist assistant message
      await appendMessage({
        planId: currentPlanId,
        taskIdentifier,
        role: "assistant",
        content: response,
      });
      // Fire-and-forget recompute of insights
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      recomputeInsights({ planId: currentPlanId, userTimezone }).catch(() => {});
    } catch (error) {
      console.error("Failed to send message:", error);
      // Persist the error message from the assistant
      await appendMessage({
        planId: currentPlanId,
        taskIdentifier,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[80vh] relative overflow-hidden rounded-2xl border border-[var(--accent-cyan)] bg-[var(--neutral-950)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  task.completed
                    ? "bg-[var(--accent-cyan)]"
                    : "border-2 border-[var(--border-subtle)]"
                }`}
              />
              <h2 className="text-xl font-semibold text-[var(--text-inverse)]">
                Task Details
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full hover:bg-[var(--bg-deep)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:ring-offset-0"
            >
              <FaTimes className="text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Task Details - Fixed at top */}
          <div className="flex-shrink-0 p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p
                  className={`text-base leading-relaxed break-words ${
                    task.completed
                      ? "line-through text-[var(--text-secondary)]"
                      : "text-[var(--text-inverse)]"
                  }`}
                >
                  {task.description}
                </p>
                {plan && (
                  <p className="text-sm mt-2 text-[var(--text-secondary)]">
                    Goal:{" "}
                    {plan.goal.length > 60
                      ? `${plan.goal.substring(0, 60)}...`
                      : plan.goal}
                  </p>
                )}
              </div>
              <button
                onClick={() => onToggleComplete(task)}
                className={`ml-4 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                  task.completed
                    ? "bg-[var(--accent-cyan)] border-[var(--accent-cyan)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]"
                }`}
                title={task.completed ? "Mark incomplete" : "Mark complete"}
              >
                <FaCheck
                  className={`text-sm ${task.completed ? "text-white" : "text-transparent"}`}
                />
              </button>
            </div>
          </div>

          {/* AI Assistant - Takes remaining space */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]">
              <div className="flex items-center space-x-2">
                <FaRobot className="text-[var(--accent-cyan)] text-sm" />
                <span className="text-sm font-medium text-[var(--text-inverse)]">
                  AI Assistant
                </span>
              </div>
            </div>

            {/* Chat Messages - Scrollable container */}
            <div
              ref={chatContainerRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
            >
              {!isLoaded ? (
                <div className="text-center py-8">
                  <FaRobot className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Loading chat...
                  </p>
                </div>
              ) : user === null ? (
                <div className="text-center py-8">
                  <FaRobot className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Please sign in to use chat
                  </p>
                </div>
              ) : hasChatError ? (
                <div className="text-center py-8">
                  <FaRobot className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Chat temporarily unavailable. Please refresh the page.
                  </p>
                </div>
              ) : messages.length === 0 && !isLoading ? (
                <div className="text-center py-8">
                  <FaRobot className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Ask me anything about this task!
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex items-start space-x-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaRobot className="text-white text-xs" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3 text-sm leading-relaxed break-words ${
                        message.role === "user"
                          ? "bg-[var(--accent-cyan)] text-white rounded-t-2xl rounded-l-2xl rounded-br-md"
                          : "bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-inverse)] rounded-t-2xl rounded-r-2xl rounded-bl-md"
                      }`}
                    >
                      {/* Markdown content */}
                      <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => (
                              <p className="mb-2" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul
                                className="list-disc pl-5 mb-2 space-y-1"
                                {...props}
                              />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol
                                className="list-decimal pl-5 mb-2 space-y-1"
                                {...props}
                              />
                            ),
                            li: ({ node, ...props }) => (
                              <li className="ml-1" {...props} />
                            ),
                            a: ({ node, ...props }) => (
                              <a
                                className="underline text-[var(--accent-cyan)]"
                                target="_blank"
                                rel="noreferrer"
                                {...props}
                              />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong className="font-semibold" {...props} />
                            ),
                            em: ({ node, ...props }) => (
                              <em className="italic" {...props} />
                            ),
                            code: (props: any) =>
                              props.inline ? (
                                <code
                                  className="px-1 rounded bg-black/20"
                                  {...props}
                                />
                              ) : (
                                <code
                                  className="block p-3 rounded bg-black/30 overflow-x-auto text-xs"
                                  {...props}
                                />
                              ),
                            input: ({ node, ...props }) => (
                              // Task list checkboxes (from GFM)
                              <input
                                {...props}
                                className="mr-2 align-middle"
                                disabled
                              />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
                        {new Date(message._creationTime).toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-6 h-6 rounded-full bg-[var(--text-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">U</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-start space-x-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FaRobot className="text-white text-xs" />
                  </div>
                  <div className="bg-[var(--bg-deep)] border border-[var(--border-subtle)] p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full animate-bounce [animation-delay:100ms]" />
                      <div className="w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full animate-bounce [animation-delay:200ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input - Fixed at bottom */}
            <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]">
              <div className="flex space-x-2">
                <textarea
                  rows={1}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    !isLoaded ? "Loading..." :
                    user === null ? "Sign in to chat" :
                    hasChatError ? "Chat unavailable for this plan" :
                    "Ask about this task..."
                  }
                  aria-label="Chat input"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--neutral-950)] text-[var(--text-inverse)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-cyan)] focus:outline-none text-sm resize-none max-h-40"
                  disabled={isChatDisabled}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isChatDisabled}
                  aria-label="Send message"
                  className="px-3 py-2 bg-[var(--accent-cyan)] text-white rounded-lg font-medium hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
