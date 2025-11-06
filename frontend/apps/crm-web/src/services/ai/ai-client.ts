/**
 * ai-client.ts
 * Frontend AI service client
 * 
 * Handles communication with backend AI service
 */

import { apiClient } from '../api/client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  stream?: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AIAnalysisRequest {
  type: 'lead_score' | 'forecast' | 'recommendation' | 'sentiment';
  data: Record<string, any>;
}

export interface AIAnalysisResponse {
  analysis: any;
  confidence: number;
  explanation: string;
}

class AIService {
  private readonly baseUrl = '/api/v1/ai';

  /**
   * Send chat message to AI
   */
  async chat(
    request: ChatRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ChatResponse> {
    try {
      const response = await apiClient.post<ChatResponse>(
        `${this.baseUrl}/chat`,
        request,
        {
          signal: options?.signal,
        }
      );

      return response;
    } catch (error: any) {
      console.error('AI chat error:', error);
      throw new Error(
        error.response?.data?.error?.message || 
        'Failed to communicate with AI service'
      );
    }
  }

  /**
   * Stream chat responses (Server-Sent Events)
   */
  async streamChat(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              onChunk(parsed.content);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Stream chat error:', error);
      onError(error);
    }
  }

  /**
   * Get AI analysis (lead scoring, forecasting, etc.)
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const response = await apiClient.post<AIAnalysisResponse>(
        `${this.baseUrl}/analyze`,
        request
      );

      return response;
    } catch (error: any) {
      console.error('AI analysis error:', error);
      throw new Error(
        error.response?.data?.error?.message || 
        'Failed to perform AI analysis'
      );
    }
  }

  /**
   * Get smart suggestions based on context
   */
  async getSuggestions(context: {
    page: string;
    entity?: string;
    entityId?: string;
    data?: Record<string, any>;
  }): Promise<string[]> {
    try {
      const response = await apiClient.post<{ suggestions: string[] }>(
        `${this.baseUrl}/suggestions`,
        context
      );

      return response.suggestions;
    } catch (error: any) {
      console.error('Get suggestions error:', error);
      return [];
    }
  }

  /**
   * Generate email draft with AI
   */
  async generateEmailDraft(context: {
    recipient: string;
    purpose: string;
    tone?: 'professional' | 'friendly' | 'formal';
    context?: string;
  }): Promise<{ subject: string; body: string }> {
    try {
      const response = await apiClient.post<{ subject: string; body: string }>(
        `${this.baseUrl}/generate/email`,
        context
      );

      return response;
    } catch (error: any) {
      console.error('Generate email error:', error);
      throw new Error('Failed to generate email draft');
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    confidence: number;
  }> {
    try {
      const response = await apiClient.post<{
        sentiment: 'positive' | 'negative' | 'neutral';
        score: number;
        confidence: number;
      }>(`${this.baseUrl}/sentiment`, { text });

      return response;
    } catch (error: any) {
      console.error('Sentiment analysis error:', error);
      throw new Error('Failed to analyze sentiment');
    }
  }

  /**
   * Get AI usage stats
   */
  async getUsageStats(): Promise<{
    tokensUsed: number;
    tokensLimit: number;
    requestsUsed: number;
    requestsLimit: number;
    resetDate: string;
  }> {
    try {
      const response = await apiClient.get<{
        tokensUsed: number;
        tokensLimit: number;
        requestsUsed: number;
        requestsLimit: number;
        resetDate: string;
      }>(`${this.baseUrl}/usage`);

      return response;
    } catch (error: any) {
      console.error('Get usage stats error:', error);
      throw new Error('Failed to get usage stats');
    }
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
}

export const aiService = new AIService();
