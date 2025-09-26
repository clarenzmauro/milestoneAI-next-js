import React, { useState } from 'react';
import { FaCheck, FaTimes, FaRobot, FaUser } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DailyTask, FullPlan } from '../../types/planTypes';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask | null;
  plan: FullPlan | null;
  onToggleComplete: (task: DailyTask) => void;
  onSendMessage: (message: string, task: DailyTask, plan: FullPlan) => Promise<string>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function TaskModal({ isOpen, onClose, task, plan, onToggleComplete, onSendMessage }: TaskModalProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !task || !plan || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setMessageInput('');
    setIsLoading(true);

    try {
      const response = await onSendMessage(messageInput.trim(), task, plan);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[80vh] relative overflow-hidden rounded-2xl border border-[var(--accent-cyan)] bg-[var(--neutral-950)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                task.completed ? 'bg-[var(--accent-cyan)]' : 'border-2 border-[var(--border-subtle)]'
              }`} />
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
                <p className={`text-base leading-relaxed break-words ${
                  task.completed ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-inverse)]'
                }`}>
                  {task.description}
                </p>
                {plan && (
                  <p className="text-sm mt-2 text-[var(--text-secondary)]">
                    Goal: {plan.goal.length > 60 ? `${plan.goal.substring(0, 60)}...` : plan.goal}
                  </p>
                )}
              </div>
              <button
                onClick={() => onToggleComplete(task)}
                className={`ml-4 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                  task.completed
                    ? 'bg-[var(--accent-cyan)] border-[var(--accent-cyan)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]'
                }`}
                title={task.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                <FaCheck className={`text-sm ${task.completed ? 'text-white' : 'text-transparent'}`} />
              </button>
            </div>
          </div>

          {/* AI Assistant - Takes remaining space */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]">
              <div className="flex items-center space-x-2">
                <FaRobot className="text-[var(--accent-cyan)] text-sm" />
                <span className="text-sm font-medium text-[var(--text-inverse)]">AI Assistant</span>
              </div>
            </div>

            {/* Chat Messages - Scrollable container */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <FaRobot className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Ask me anything about this task!
                  </p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-2 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaRobot className="text-white text-xs" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3 text-sm leading-relaxed break-words ${
                        message.role === 'user'
                          ? 'bg-[var(--accent-cyan)] text-white rounded-t-2xl rounded-l-2xl rounded-br-md'
                          : 'bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-inverse)] rounded-t-2xl rounded-r-2xl rounded-bl-md'
                      }`}
                    >
                      {/* Markdown content */}
                      <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                            li: ({ node, ordered, ...props }) => <li className="ml-1" {...props} />,
                            a: ({ node, ...props }) => <a className="underline text-[var(--accent-cyan)]" target="_blank" rel="noreferrer" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                            em: ({ node, ...props }) => <em className="italic" {...props} />,
                            code: ({ inline, ...props }) => (
                              inline ? (
                                <code className="px-1 rounded bg-black/20" {...props} />
                              ) : (
                                <code className="block p-3 rounded bg-black/30 overflow-x-auto text-xs" {...props} />
                              )
                            ),
                            input: ({ node, ...props }) => (
                              // Task list checkboxes (from GFM)
                              <input {...props} className="mr-2 align-middle" disabled />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === 'user' && (
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
                    el.style.height = 'auto';
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask about this task..."
                  aria-label="Chat input"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--neutral-950)] text-[var(--text-inverse)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-cyan)] focus:outline-none text-sm resize-none max-h-40"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isLoading}
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
