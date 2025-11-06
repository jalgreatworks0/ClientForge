/**
 * ChatInput.tsx
 * Chat message input component
 * 
 * Handles user message input with send button
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle send
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Handle Enter key (Send message)
  // Shift+Enter for new line
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex items-end gap-2">
      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full px-4 py-3 pr-12",
            "bg-gray-50 border border-gray-300 rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
            "resize-none",
            "text-sm",
            "placeholder:text-gray-400",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />

        {/* Character count (optional) */}
        {message.length > 500 && (
          <span
            className={cn(
              "absolute bottom-2 right-2 text-xs",
              message.length > 1000 ? "text-red-500" : "text-gray-400"
            )}
          >
            {message.length}/1000
          </span>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className={cn(
          "p-3 rounded-lg",
          "bg-indigo-600 hover:bg-indigo-700",
          "text-white",
          "transition-all duration-200",
          "disabled:bg-gray-300 disabled:cursor-not-allowed",
          "flex items-center justify-center",
          "group"
        )}
        aria-label="Send message"
      >
        <Send className={cn(
          "w-5 h-5",
          !disabled && message.trim() && "group-hover:translate-x-0.5 transition-transform"
        )} />
      </button>
    </div>
  );
};
