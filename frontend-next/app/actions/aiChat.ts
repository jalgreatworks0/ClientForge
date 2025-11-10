/**
 * AI Chat Actions - Server Actions for AI Interactions
 * Location: D:\ClientForge\02_CODE\frontend\app\actions\aiChat.ts
 * Purpose: Type-safe server actions for AI chat
 */

'use server';

import { z } from 'zod';

// Validation schemas
const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(MessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(32000).optional(),
});

const QuickChatSchema = z.object({
  prompt: z.string().min(1),
  model: z.string(),
});

// Types
export type Message = z.infer<typeof MessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type QuickChatRequest = z.infer<typeof QuickChatSchema>;

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Send a chat completion request
 */
export async function aiChat(request: ChatRequest) {
  try {
    // Validate input
    const validated = ChatRequestSchema.parse(request);

    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI chat failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('AI chat error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick chat helper for simple prompts
 */
export async function quickChat(request: QuickChatRequest) {
  try {
    const validated = QuickChatSchema.parse(request);

    const response = await fetch(`${API_URL}/ai/quick-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated),
    });

    if (!response.ok) {
      throw new Error(`Quick chat failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      response: data.response,
      model: data.model,
    };
  } catch (error) {
    console.error('Quick chat error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List available models
 */
export async function listModels() {
  try {
    const response = await fetch(`${API_URL}/ai/models`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const models = await response.json();
    return {
      success: true,
      models,
    };
  } catch (error) {
    console.error('List models error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      models: [],
    };
  }
}

/**
 * Check AI service health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/ai/health`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const health = await response.json();
    return {
      success: true,
      health,
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      health: { ok: false },
    };
  }
}

/**
 * Warm up a model (trigger JIT load)
 */
export async function warmupModel(modelId: string) {
  try {
    const response = await fetch(`${API_URL}/ai/warmup/${modelId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Warmup failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Warmup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// STRUCTURED OUTPUT ACTIONS
// ============================================================

/**
 * Analyze contact with structured insights
 */
export async function analyzeContact(contactData: any, model?: string) {
  try {
    const response = await fetch(`${API_URL}/ai/analyze-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactData, model }),
    });

    if (!response.ok) {
      throw new Error(`Contact analysis failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      analysis: data.analysis,
    };
  } catch (error) {
    console.error('Contact analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Predict deal outcome with structured analysis
 */
export async function predictDeal(dealData: any, model?: string) {
  try {
    const response = await fetch(`${API_URL}/ai/predict-deal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dealData, model }),
    });

    if (!response.ok) {
      throw new Error(`Deal prediction failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      prediction: data.prediction,
    };
  } catch (error) {
    console.error('Deal prediction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate professional email with structured format
 */
export async function generateEmail(context: {
  recipientName: string;
  recipientRole?: string;
  purpose: string;
  keyPoints?: string[];
  tone?: 'formal' | 'friendly' | 'urgent' | 'casual';
  model?: string;
}) {
  try {
    const response = await fetch(`${API_URL}/ai/generate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error(`Email generation failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      email: data.email,
    };
  } catch (error) {
    console.error('Email generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Summarize meeting notes into structured format
 */
export async function summarizeMeeting(notes: string, model?: string) {
  try {
    const response = await fetch(`${API_URL}/ai/summarize-meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes, model }),
    });

    if (!response.ok) {
      throw new Error(`Meeting summary failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      summary: data.summary,
    };
  } catch (error) {
    console.error('Meeting summary error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute search with AI tool calling
 */
export async function searchWithTools(query: string, model?: string) {
  try {
    const response = await fetch(`${API_URL}/ai/search-with-tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, model }),
    });

    if (!response.ok) {
      throw new Error(`Tool search failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result,
    };
  } catch (error) {
    console.error('Tool search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get structured output with custom schema
 */
export async function getStructuredOutput(prompt: string, schema: any, model?: string) {
  try {
    const response = await fetch(`${API_URL}/ai/structured-output`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, schema, model }),
    });

    if (!response.ok) {
      throw new Error(`Structured output failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result,
    };
  } catch (error) {
    console.error('Structured output error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
