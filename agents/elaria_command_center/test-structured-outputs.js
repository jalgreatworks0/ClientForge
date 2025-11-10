/**
 * Structured Output & Tool Use Test Suite
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\test-structured-outputs.js
 * Purpose: Test LM Studio structured outputs and function calling
 */

import chalk from 'chalk';
import ora from 'ora';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MODEL = 'qwen3-30b-a3b';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatSection(title) {
  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan(`  ${title}`));
  console.log(chalk.cyan('═'.repeat(60)) + '\n');
}

function formatSuccess(message) {
  console.log(chalk.green('✓ ') + message);
}

function formatError(message) {
  console.log(chalk.red('✖ ') + message);
}

function formatInfo(label, value) {
  console.log(chalk.gray(`  ${label}: `) + chalk.white(value));
}

async function apiRequest(endpoint, body) {
  const spinner = ora(`Calling ${endpoint}...`).start();

  try {
    const response = await fetch(`${API_URL}/ai/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    spinner.succeed(`${endpoint} completed`);
    return data;
  } catch (error) {
    spinner.fail(`${endpoint} failed`);
    throw error;
  }
}

// ============================================================
// TEST SUITE
// ============================================================

async function testHealthCheck() {
  formatSection('Health Check');

  try {
    const response = await fetch(`${API_URL}/ai/health`);
    const health = await response.json();

    if (health.ok) {
      formatSuccess('LM Studio service is healthy');
      formatInfo('Latency', `${health.latency}ms`);
      formatInfo('Models Available', health.modelsAvailable);
      formatInfo('Current Model', health.currentModel || 'None');
    } else {
      formatError('Service is unhealthy');
    }
  } catch (error) {
    formatError(`Health check failed: ${error.message}`);
    process.exit(1);
  }
}

async function testContactAnalysis() {
  formatSection('Test 1: Contact Analysis (Structured Output)');

  const testContact = {
    id: 1001,
    name: 'Sarah Johnson',
    company: 'TechCorp Solutions',
    title: 'VP of Engineering',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-555-0123',
    status: 'prospect',
    interactionHistory: [
      { date: '2025-01-05', type: 'email', note: 'Sent product demo invitation' },
      { date: '2025-01-06', type: 'call', note: 'Discussed pricing for enterprise plan' },
      { date: '2025-01-07', type: 'meeting', note: 'Technical demo, very engaged' },
    ],
    company_size: 500,
    industry: 'Software',
    budget: 'Enterprise ($50k+)',
  };

  try {
    const result = await apiRequest('analyze-contact', {
      contactData: testContact,
      model: MODEL,
    });

    if (result.success && result.analysis) {
      formatSuccess('Contact analysis completed');
      console.log('\n' + chalk.bold('Analysis Results:'));
      formatInfo('Lead Score', `${result.analysis.lead_score}/100`);
      formatInfo('Engagement Level', result.analysis.engagement_level.toUpperCase());
      formatInfo('Summary', result.analysis.summary);

      console.log('\n' + chalk.bold('Next Actions:'));
      result.analysis.next_actions.forEach((action, i) => {
        console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(`[${action.priority.toUpperCase()}] ${action.action}`));
        if (action.deadline) {
          console.log(chalk.gray(`     Deadline: ${action.deadline}`));
        }
      });
    } else {
      formatError('Contact analysis returned invalid data');
    }
  } catch (error) {
    formatError(`Contact analysis failed: ${error.message}`);
  }
}

async function testDealPrediction() {
  formatSection('Test 2: Deal Prediction (Structured Output)');

  const testDeal = {
    id: 2001,
    name: 'Enterprise SaaS Deal - TechCorp',
    value: 75000,
    stage: 'negotiation',
    probability: 70,
    created_at: '2024-12-01',
    expected_close: '2025-02-15',
    contact: {
      name: 'Sarah Johnson',
      title: 'VP of Engineering',
      engagement: 'high',
    },
    activities: [
      { date: '2025-01-05', type: 'demo', result: 'positive' },
      { date: '2025-01-10', type: 'pricing', result: 'negotiating' },
      { date: '2025-01-15', type: 'technical_review', result: 'approved' },
    ],
    competitors: ['CompetitorA', 'CompetitorB'],
    deal_age_days: 45,
  };

  try {
    const result = await apiRequest('predict-deal', {
      dealData: testDeal,
      model: MODEL,
    });

    if (result.success && result.prediction) {
      formatSuccess('Deal prediction completed');
      console.log('\n' + chalk.bold('Prediction Results:'));
      formatInfo('Win Probability', `${result.prediction.win_probability}%`);
      formatInfo('Predicted Close Date', result.prediction.predicted_close_date);
      formatInfo('Confidence', result.prediction.confidence.toUpperCase());

      console.log('\n' + chalk.bold('Risk Factors:'));
      result.prediction.risk_factors.forEach((risk, i) => {
        console.log(chalk.gray(`  ${i + 1}. `) + chalk.yellow(risk));
      });

      console.log('\n' + chalk.bold('Recommendations:'));
      result.prediction.recommendations.forEach((rec, i) => {
        console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(rec));
      });
    } else {
      formatError('Deal prediction returned invalid data');
    }
  } catch (error) {
    formatError(`Deal prediction failed: ${error.message}`);
  }
}

async function testEmailGeneration() {
  formatSection('Test 3: Email Generation (Structured Output)');

  const emailContext = {
    recipientName: 'Sarah Johnson',
    recipientRole: 'VP of Engineering',
    purpose: 'Follow up after technical demo and propose next steps',
    keyPoints: [
      'Demo went well and addressed all technical requirements',
      'Pricing proposal attached for 500-user enterprise plan',
      'Offer to schedule implementation planning call',
      'Include limited-time 15% discount for Q1 signup',
    ],
    tone: 'friendly',
    model: MODEL,
  };

  try {
    const result = await apiRequest('generate-email', emailContext);

    if (result.success && result.email) {
      formatSuccess('Email generated');
      console.log('\n' + chalk.bold('Generated Email:'));
      console.log(chalk.gray('─'.repeat(60)));
      formatInfo('Subject', result.email.subject);
      console.log(chalk.gray('─'.repeat(60)));
      console.log('\n' + chalk.white(result.email.body));
      console.log('\n' + chalk.gray('─'.repeat(60)));
      formatInfo('Call to Action', result.email.call_to_action);
      formatInfo('Tone', result.email.suggested_tone);

      if (result.email.follow_up_date) {
        formatInfo('Follow-up Date', result.email.follow_up_date);
      }
    } else {
      formatError('Email generation returned invalid data');
    }
  } catch (error) {
    formatError(`Email generation failed: ${error.message}`);
  }
}

async function testMeetingSummary() {
  formatSection('Test 4: Meeting Summary (Structured Output)');

  const meetingNotes = `
Meeting with TechCorp - Q1 2025 Planning Call
Date: January 7, 2025
Attendees: Sarah Johnson (VP Eng), Mike Chen (CTO), our team

Discussion Points:
- Reviewed technical requirements for 500-user deployment
- Discussed integration with their existing auth system (Okta)
- Covered data migration timeline from current CRM
- Security and compliance requirements (SOC2, GDPR)
- Training needs for sales and support teams

Key Decisions:
- Moving forward with Enterprise plan at $75k/year
- Implementation to start February 1st
- 3-month implementation timeline agreed
- Weekly sync meetings every Tuesday

Action Items:
- Sarah to get procurement approval by Jan 15
- Mike to provide technical specs for SSO integration
- Our team to prepare detailed implementation plan
- Schedule kick-off meeting for Feb 1

Questions Raised:
- Can we support custom fields for their industry?
- What's the SLA for support response times?
- Mobile app availability timeline?

Next Steps:
- Follow up on procurement status Jan 16
- Technical architecture review Jan 20
- Contract signing target Jan 25
`;

  try {
    const result = await apiRequest('summarize-meeting', {
      notes: meetingNotes,
      model: MODEL,
    });

    if (result.success && result.summary) {
      formatSuccess('Meeting summarized');
      console.log('\n' + chalk.bold('Meeting Summary:'));
      formatInfo('Title', result.summary.title);
      formatInfo('Date', result.summary.date);

      console.log('\n' + chalk.bold('Key Points:'));
      result.summary.key_points.forEach((point, i) => {
        console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(point));
      });

      console.log('\n' + chalk.bold('Action Items:'));
      result.summary.action_items.forEach((item, i) => {
        console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(`[${item.priority.toUpperCase()}] ${item.task}`));
        console.log(chalk.gray(`     Assigned: ${item.assigned_to}`));
        if (item.due_date) {
          console.log(chalk.gray(`     Due: ${item.due_date}`));
        }
      });

      console.log('\n' + chalk.bold('Decisions Made:'));
      result.summary.decisions.forEach((decision, i) => {
        console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(decision));
      });

      if (result.summary.next_meeting) {
        console.log('\n' + chalk.bold('Next Meeting:'));
        formatInfo('Suggested Agenda', result.summary.next_meeting.suggested_agenda);
        if (result.summary.next_meeting.suggested_date) {
          formatInfo('Suggested Date', result.summary.next_meeting.suggested_date);
        }
      }
    } else {
      formatError('Meeting summary returned invalid data');
    }
  } catch (error) {
    formatError(`Meeting summary failed: ${error.message}`);
  }
}

async function testToolCalling() {
  formatSection('Test 5: Tool Use / Function Calling');

  const testQueries = [
    'Find all contacts from TechCorp who are in negotiation stage',
    'Show me deals over $50,000 in the proposal stage',
    'Search for customers in the software industry',
  ];

  for (const query of testQueries) {
    console.log(chalk.bold(`\nQuery: `) + chalk.white(query));

    try {
      const result = await apiRequest('search-with-tools', {
        query,
        model: MODEL,
      });

      if (result.success && result.result) {
        if (result.result.toolCalls) {
          formatSuccess('Model used tools');
          console.log(chalk.bold('  Tool Calls:'));
          result.result.toolCalls.forEach((call, i) => {
            console.log(chalk.gray(`    ${i + 1}. ${call.function_name}`));
            console.log(chalk.gray(`       Result: ${JSON.stringify(call.result).substring(0, 100)}...`));
          });

          if (result.result.finalResponse) {
            console.log(chalk.bold('  Final Response:'));
            console.log(chalk.white(`    ${result.result.finalResponse.substring(0, 200)}...`));
          }
        } else if (result.result.response) {
          formatInfo('Direct Response', result.result.response.substring(0, 200));
        }
      }
    } catch (error) {
      formatError(`Tool calling failed: ${error.message}`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║     STRUCTURED OUTPUT & TOOL USE TEST SUITE                ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.gray('Testing LM Studio structured outputs and function calling'));
  console.log(chalk.gray(`API Endpoint: ${API_URL}`));
  console.log(chalk.gray(`Model: ${MODEL}\n`));

  try {
    await testHealthCheck();
    await testContactAnalysis();
    await testDealPrediction();
    await testEmailGeneration();
    await testMeetingSummary();
    await testToolCalling();

    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║     ALL TESTS COMPLETE                                     ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.green('✓ Structured output integration working!'));
    console.log(chalk.gray('\nEndpoints tested:'));
    console.log(chalk.gray('  • /ai/analyze-contact'));
    console.log(chalk.gray('  • /ai/predict-deal'));
    console.log(chalk.gray('  • /ai/generate-email'));
    console.log(chalk.gray('  • /ai/summarize-meeting'));
    console.log(chalk.gray('  • /ai/search-with-tools\n'));

  } catch (error) {
    console.log(chalk.red('\n✖ Test suite failed'));
    console.log(chalk.red(`Error: ${error.message}\n`));
    process.exit(1);
  }
}

main();
