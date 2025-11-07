#!/usr/bin/env tsx
// Reviewer adapter (OpenAI GPT SDK) - API implementation
// Uses openai SDK + GPT_API_KEY to perform rubric-based code reviews

import OpenAI from 'openai';
import * as readline from 'readline';

interface ReviewResult {
  pr_url: string;
  scores: {
    correctness: number;
    type_safety: number;
    security: number;
    observability: number;
    dx_ergonomics: number;
    test_coverage: number;
    incrementality: number;
    risk_control: number;
  };
  evidence: Array<{ file: string; line: number; note: string }>;
  verdict: 'approve' | 'approve_with_comments' | 'request_changes' | 'reject';
  total: number;
  percentage: number;
  required_changes: string[];
  optional_suggestions: string[];
  notes?: string;
}

const MODEL = process.env.GPT_MODEL || 'gpt-4-turbo';

const REVIEWER_PROMPT = `You are a code reviewer for ClientForge CRM. Review the PR/diff and score it using the 8-dimension rubric (0-5 scale):

1. Correctness (works, handles edge cases)
2. Type-Safety (TypeScript strict, no any)
3. Security (OWASP Top 10, input validation)
4. Observability (logs, metrics, traces)
5. DX/Ergonomics (clear naming, good docs)
6. Test Coverage (85%+ coverage, edge cases)
7. Incrementality (PR size <300 LOC)
8. Risk Control (feature flags, rollback plan)

Return ONLY valid JSON (no markdown, no explanation):
{
  "pr_url": "<url>",
  "scores": {
    "correctness": 0-5,
    "type_safety": 0-5,
    "security": 0-5,
    "observability": 0-5,
    "dx_ergonomics": 0-5,
    "test_coverage": 0-5,
    "incrementality": 0-5,
    "risk_control": 0-5
  },
  "evidence": [{"file": "path.ts", "line": 42, "note": "Zero any types"}],
  "verdict": "approve|approve_with_comments|request_changes|reject",
  "total": 0-40,
  "percentage": 0-100,
  "required_changes": ["list", "of", "blockers"],
  "optional_suggestions": ["list", "of", "nice-to-haves"],
  "notes": "Brief summary"
}

Scoring thresholds: 36-40 (approve), 30-35 (approve with comments), 24-29 (request changes), <24 (reject)`;

async function reviewWithGPT(prUrl: string, apiKey: string): Promise<ReviewResult> {
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: REVIEWER_PROMPT
      },
      {
        role: 'user',
        content: `Review this PR: ${prUrl}\n\n(Note: In production, fetch actual diff/code here)`
      }
    ]
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('Empty response from GPT');
  }

  const review = JSON.parse(content);

  // Validate required fields
  if (!review.scores || !review.verdict || typeof review.total !== 'number') {
    throw new Error('Invalid review schema from GPT API');
  }

  return review;
}

// CLI mode: read PR URL from stdin
async function main() {
  const apiKey = process.env.GPT_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: 'GPT_API_KEY not set in environment' }));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  let inputBuffer = '';
  rl.on('line', (line) => {
    inputBuffer += line;
  });

  rl.on('close', async () => {
    try {
      const prUrl = inputBuffer.trim() || 'https://github.com/org/repo/pull/1';
      const review = await reviewWithGPT(prUrl, apiKey);
      console.log(JSON.stringify(review, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({
        error: 'Reviewer failed',
        message: error.message,
        pr_url: 'error'
      }));
      process.exit(1);
    }
  });
}

// Export for orchestrator
export { reviewWithGPT };

// Run if called directly
if (require.main === module) {
  main();
}
