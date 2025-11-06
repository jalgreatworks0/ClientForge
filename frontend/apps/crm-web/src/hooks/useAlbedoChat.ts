/**
 * useAlbedoChat.ts
 * Custom React hook for Albedo AI chat functionality
 * 
 * Handles message sending, AI responses, conversation management,
 * and context awareness
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Conversation } from '../components/AICompanion/ChatMessage';
import { aiService } from '../services/ai/ai-client';

interface UseAlbedoChatReturn {
  messages: Message[];
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  createNewConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearCurrentConversation: () => void;
}

export const useAlbedoChat = (
  currentPage: string,
  contextData: Record<string, any>
): UseAlbedoChatReturn => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const loadConversations = () => {
      try {
        const stored = localStorage.getItem('albedo_conversations');
        if (stored) {
          const parsed = JSON.parse(stored);
          setConversations(parsed.map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
          })));
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    loadConversations();
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('albedo_conversations', JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }, [conversations]);

  // Load current conversation messages
  useEffect(() => {
    if (currentConversationId) {
      const loadMessages = () => {
        try {
          const stored = localStorage.getItem(`albedo_messages_${currentConversationId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            setMessages(parsed.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })));
          }
        } catch (error) {
          console.error('Failed to load messages:', error);
        }
      };

      loadMessages();
    }
  }, [currentConversationId]);

  // Save messages whenever they change
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      try {
        localStorage.setItem(
          `albedo_messages_${currentConversationId}`,
          JSON.stringify(messages)
        );
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    }
  }, [messages, currentConversationId]);

  // Build context-aware system prompt
  const buildSystemPrompt = useCallback(() => {
    let prompt = `You are Albedo, an intelligent AI assistant for ClientForge CRM. `;
    prompt += `You help users navigate the system, answer questions, and perform tasks. `;
    prompt += `Be helpful, concise, and friendly.\n\n`;

    // Add page context
    prompt += `Current Page: ${currentPage}\n`;

    // Add page-specific context
    if (currentPage === 'dashboard') {
      prompt += `The user is on the dashboard. You can help them understand their metrics, `;
      prompt += `view recent activities, or navigate to specific sections.\n`;
    } else if (currentPage === 'contacts') {
      prompt += `The user is viewing contacts. You can help them search, filter, add, `;
      prompt += `edit, or delete contacts.\n`;
    } else if (currentPage === 'deals') {
      prompt += `The user is viewing deals. You can help them manage the sales pipeline, `;
      prompt += `update deal stages, or analyze deal metrics.\n`;
    } else if (currentPage === 'tasks') {
      prompt += `The user is viewing tasks. You can help them create, assign, and manage tasks.\n`;
    }

    // Add any additional context data
    if (Object.keys(contextData).length > 0) {
      prompt += `\nContext Data:\n${JSON.stringify(contextData, null, 2)}\n`;
    }

    prompt += `\nAlways provide actionable suggestions and be ready to help with common CRM tasks.`;

    return prompt;
  }, [currentPage, contextData]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Create or use current conversation
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = `conv_${Date.now()}`;
      setCurrentConversationId(conversationId);
      
      const newConversation: Conversation = {
        id: conversationId,
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        lastMessage: content,
        timestamp: new Date(),
        messageCount: 0,
      };
      setConversations(prev => [newConversation, ...prev]);
    }

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Get system prompt with context
      const systemPrompt = buildSystemPrompt();

      // Build conversation history for AI
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Add current user message
      conversationHistory.push({
        role: 'user',
        content: content,
      });

      // Call AI service
      const response = await aiService.chat({
        messages: conversationHistory,
        systemPrompt,
        stream: false,
      }, {
        signal: abortControllerRef.current.signal,
      });

      // Add AI response
      const aiMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId
          ? {
              ...conv,
              lastMessage: response.message.slice(0, 100),
              timestamp: new Date(),
              messageCount: conv.messageCount + 2,
            }
          : conv
      ));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }

      console.error('Failed to send message:', error);

      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [messages, currentConversationId, isLoading, buildSystemPrompt]);

  // Create new conversation
  const createNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  // Load conversation
  const loadConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
  }, []);

  // Delete conversation
  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    
    // Delete messages from localStorage
    try {
      localStorage.removeItem(`albedo_messages_${id}`);
    } catch (error) {
      console.error('Failed to delete conversation messages:', error);
    }

    // If deleting current conversation, clear it
    if (id === currentConversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
  }, [currentConversationId]);

  // Clear current conversation
  const clearCurrentConversation = useCallback(() => {
    if (currentConversationId) {
      deleteConversation(currentConversationId);
    }
  }, [currentConversationId, deleteConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
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
  };
};
