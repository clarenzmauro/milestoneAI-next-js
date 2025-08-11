import React from 'react';
import type { ChatMessage } from '../../types/chatTypes'; 
import ReactMarkdown from 'react-markdown';

interface ConversationUIProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
}

const ConversationUI: React.FC<ConversationUIProps> = ({ messages, isStreaming = false }) => {
  return (
    <div className="flex flex-col gap-2.5 p-2.5 overflow-y-auto h-full">
      {messages.map((msg: ChatMessage, index) => {
        const isLastMessage = index === messages.length - 1;
        const isStreamingThisMessage = isStreaming && isLastMessage && msg.role === 'ai';
        
        return (
          <div
            key={msg.id}
            className={`px-4 py-2 rounded-[12px] max-w-[85%] leading-[1.4] text-[13px] ${msg.role === 'user' ? 'self-end bg-[var(--color-border,#E5E9ED)] text-[var(--color-text-main,#1A1A1A)] rounded-br-[2px]' : 'self-start bg-[var(--color-background-highlight,#EDF5FF)] text-[var(--color-text-main,#1A1A1A)] rounded-bl-[2px]'}`}>
            <ReactMarkdown
              components={{
                ul: ({node, ...props}) => <ul className="pl-5 mt-1 mb-1 list-disc" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-[var(--color-code-background,#2d3748)] text-[var(--color-code-text,#e2e8f0)] px-4 py-2 rounded-md mt-2 mb-2 overflow-x-auto text-[11px]" {...props} />,
              }}
            >
              {msg.text}
            </ReactMarkdown>
            {isStreamingThisMessage && (
              <span className="inline-block animate-pulse font-bold text-[#4A90E2] ml-0.5">▊</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationUI;
