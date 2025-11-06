/**
 * ChatHistory.tsx
 * Chat conversation history sidebar
 * 
 * Displays past conversations and allows switching between them
 */

import React from 'react';
import { X, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/helpers';

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface ChatHistoryProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClose: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  conversations,
  currentConversationId,
  onLoadConversation,
  onDeleteConversation,
  onClose,
}) => {
  // Group conversations by date
  const groupedConversations = React.useMemo(() => {
    const groups: Record<string, Conversation[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    conversations.forEach((conv) => {
      const convDate = new Date(conv.timestamp);
      if (convDate >= todayStart) {
        groups.today.push(conv);
      } else if (convDate >= yesterdayStart) {
        groups.yesterday.push(conv);
      } else if (convDate >= weekStart) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations]);

  const renderConversationGroup = (title: string, convs: Conversation[]) => {
    if (convs.length === 0) return null;

    return (
      <div key={title} className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
          {title}
        </h4>
        <div className="space-y-1">
          {convs.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group relative px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                "hover:bg-gray-100",
                conv.id === currentConversationId
                  ? "bg-indigo-50 border border-indigo-200"
                  : "border border-transparent"
              )}
              onClick={() => onLoadConversation(conv.id)}
            >
              {/* Conversation Title */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 truncate">
                    {conv.title}
                  </h5>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                <MessageSquare className="w-3 h-3" />
                <span>{conv.messageCount} messages</span>
                <span>•</span>
                <span>{formatRelativeTime(conv.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Chat History</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          aria-label="Close history"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <>
            {renderConversationGroup('Today', groupedConversations.today)}
            {renderConversationGroup('Yesterday', groupedConversations.yesterday)}
            {renderConversationGroup('This Week', groupedConversations.thisWeek)}
            {renderConversationGroup('Older', groupedConversations.older)}
          </>
        )}
      </div>
    </div>
  );
};

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
