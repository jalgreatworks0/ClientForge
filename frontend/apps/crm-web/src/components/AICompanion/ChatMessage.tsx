/**
 * ChatMessage.tsx
 * Individual chat message component
 * 
 * Displays user and AI messages with proper styling
 */

import React from 'react';
import { User, Bot, Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';
import ReactMarkdown from 'react-markdown';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser 
            ? "bg-indigo-600" 
            : "bg-gradient-to-r from-purple-500 to-indigo-500"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "flex flex-col max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-indigo-600 text-white rounded-br-none"
              : "bg-gray-100 text-gray-900 rounded-bl-none",
            message.isError && "bg-red-100 text-red-900 border border-red-200"
          )}
        >
          {isLoading ? (
            // Loading indicator
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            // Message content with markdown support
            <div className={cn(
              "text-sm",
              isUser ? "prose-invert" : "prose prose-sm max-w-none"
            )}>
              {isUser ? (
                // User messages: plain text
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              ) : (
                // AI messages: markdown support
                <ReactMarkdown
                  components={{
                    // Custom styling for markdown elements
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => (
                      <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2">
                        {children}
                      </pre>
                    ),
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
};
