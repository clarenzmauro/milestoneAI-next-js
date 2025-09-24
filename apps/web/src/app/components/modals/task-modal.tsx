import React, { useState } from 'react';
import { FaCheck, FaTimes, FaRobot, FaUser } from 'react-icons/fa';
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-[800px] max-h-[80vh] relative"
        style={{
          borderRadius: '24px',
          border: '1px solid #40B4BB',
          background: '#18181B',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                task.completed ? 'bg-[var(--accent-cyan)]' : 'border-2 border-[var(--border-subtle)]'
              }`} />
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-inverse)' }}>
                Task Details
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--bg-deep)] transition-colors"
            >
              <FaTimes className="text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full">
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
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
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
                <span className="text-sm font-medium" style={{ color: 'var(--text-inverse)' }}>AI Assistant</span>
              </div>
            </div>

            {/* Chat Messages - Scrollable container */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <div className="p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <FaRobot className="text-2xl text-[var(--accent-cyan)] mx-auto mb-3" />
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                          className={`max-w-[85%] p-3 rounded-lg break-words ${
                            message.role === 'user'
                              ? 'bg-[var(--accent-cyan)] text-white'
                              : 'bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-inverse)]'
                          }`}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
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
                          <div className="w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Input - Fixed at bottom */}
            <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about this task..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--neutral-950)] text-[var(--text-inverse)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-cyan)] focus:outline-none text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isLoading}
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
