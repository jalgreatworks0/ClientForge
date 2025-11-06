/**
 * AlbedoChat.tsx
 * Main Albedo AI Chat Widget Component
 * 
 * Floating chat interface with AI assistant capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatHistory } from './ChatHistory';
import { useAlbedoChat } from '../../hooks/useAlbedoChat';
import { cn } from '../../utils/helpers';

interface AlbedoChatProps {
  currentPage?: string;
  contextData?: Record<string, any>;
}

export const AlbedoChat: React.FC<AlbedoChatProps> = ({ 
  currentPage = 'dashboard',
  contextData = {}
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Custom hook for chat logic
  const {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isTyping,
    sendMessage,
    createNewConversation,
    loadConversation,
    deleteConversation,
    clearCurrentConversation,
  } = useAlbedoChat(currentPage, contextData);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle message send
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;
    await sendMessage(message);
  };

  // Toggle chat window
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsMinimized(false);
      setShowHistory(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-14 h-14 rounded-full",
            "bg-gradient-to-r from-indigo-600 to-purple-600",
            "hover:from-indigo-700 hover:to-purple-700",
            "shadow-lg hover:shadow-xl",
            "flex items-center justify-center",
            "transition-all duration-200",
            "group"
          )}
          aria-label="Open Albedo AI Chat"
        >
          <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          
          {/* Notification Badge (if needed) */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
            AI
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "bg-white rounded-lg shadow-2xl",
            "flex flex-col",
            "transition-all duration-300",
            isMinimized ? "w-80 h-14" : "w-96 h-[600px]",
            "border border-gray-200"
          )}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Albedo AI</h3>
                <p className="text-xs text-white/80">
                  {isTyping ? 'Typing...' : 'Your AI Assistant'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                aria-label="Chat History"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* New Chat Button */}
              <button
                onClick={createNewConversation}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                aria-label="New Chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* Minimize Button */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={toggleChat}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          {!isMinimized && (
            <div className="flex flex-1 overflow-hidden">
              {/* Chat History Sidebar */}
              {showHistory && (
                <ChatHistory
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onLoadConversation={loadConversation}
                  onDeleteConversation={deleteConversation}
                  onClose={() => setShowHistory(false)}
                />
              )}

              {/* Messages Area */}
              <div className="flex-1 flex flex-col">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    // Welcome Message
                    <div className="text-center text-gray-500 mt-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-indigo-600" />
                      </div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Hi! I'm Albedo, your AI assistant
                      </h4>
                      <p className="text-sm">
                        Ask me anything about ClientForge CRM or how to use this page.
                      </p>
                      
                      {/* Quick Actions */}
                      <div className="mt-6 space-y-2">
                        <button
                          onClick={() => handleSendMessage("What can I do on this page?")}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                        >
                          💡 What can I do on this page?
                        </button>
                        <button
                          onClick={() => handleSendMessage("Show me my top deals")}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                        >
                          🎯 Show me my top deals
                        </button>
                        <button
                          onClick={() => handleSendMessage("What tasks do I have today?")}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                        >
                          ✅ What tasks do I have today?
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          isLoading={isLoading && message.role === 'assistant' && !message.content}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4">
                  {messages.length > 0 && (
                    <button
                      onClick={clearCurrentConversation}
                      className="text-xs text-gray-500 hover:text-red-600 mb-2 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear conversation
                    </button>
                  )}
                  <ChatInput
                    onSend={handleSendMessage}
                    disabled={isLoading}
                    placeholder={
                      isLoading 
                        ? "Albedo is thinking..." 
                        : "Ask Albedo anything..."
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
