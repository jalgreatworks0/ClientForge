/**
 * AI Tools - Function Calling System
 * Defines tools/actions that Albedo can execute autonomously
 *
 * This enables Albedo to:
 * - Create/update/delete contacts, deals, tasks
 * - Send emails
 * - Search and query data
 * - Generate reports
 * - Execute workflows
 */

import { dbAll, dbRun, dbGet } from '../../utils/database';
import fetch from 'node-fetch';

// =====================================================
// TOOL DEFINITIONS
// =====================================================

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any, context: AIToolContext) => Promise<any>;
}

export interface AIToolContext {
  userId: number;
  tenantId?: number;
}

// =====================================================
// CONTACT TOOLS
// =====================================================

export const createContactTool: AITool = {
  name: 'create_contact',
  description: 'Create a new contact in the CRM',
  parameters: {
    type: 'object',
    properties: {
      firstName: { type: 'string', description: 'Contact first name' },
      lastName: { type: 'string', description: 'Contact last name' },
      email: { type: 'string', description: 'Contact email address' },
      phone: { type: 'string', description: 'Contact phone number' },
      company: { type: 'string', description: 'Company name' },
      title: { type: 'string', description: 'Job title' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
    },
    required: ['firstName', 'lastName'],
  },
  execute: async (params, context) => {
    const result = await dbRun(
      `INSERT INTO contacts (
        user_id, first_name, last_name, email, phone, company, title, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        context.userId,
        params.firstName,
        params.lastName,
        params.email || null,
        params.phone || null,
        params.company || null,
        params.title || null,
      ]
    );

    return {
      success: true,
      contactId: result.lastID,
      message: `Contact "${params.firstName} ${params.lastName}" created successfully`,
    };
  },
};

export const updateContactTool: AITool = {
  name: 'update_contact',
  description: 'Update an existing contact',
  parameters: {
    type: 'object',
    properties: {
      contactId: { type: 'number', description: 'Contact ID to update' },
      firstName: { type: 'string', description: 'New first name' },
      lastName: { type: 'string', description: 'New last name' },
      email: { type: 'string', description: 'New email' },
      phone: { type: 'string', description: 'New phone' },
      company: { type: 'string', description: 'New company' },
      title: { type: 'string', description: 'New title' },
    },
    required: ['contactId'],
  },
  execute: async (params, context) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (params.firstName) {
      updates.push('first_name = ?');
      values.push(params.firstName);
    }
    if (params.lastName) {
      updates.push('last_name = ?');
      values.push(params.lastName);
    }
    if (params.email) {
      updates.push('email = ?');
      values.push(params.email);
    }
    if (params.phone) {
      updates.push('phone = ?');
      values.push(params.phone);
    }
    if (params.company) {
      updates.push('company = ?');
      values.push(params.company);
    }
    if (params.title) {
      updates.push('title = ?');
      values.push(params.title);
    }

    updates.push("updated_at = datetime('now')");
    values.push(params.contactId, context.userId);

    await dbRun(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    return {
      success: true,
      message: `Contact updated successfully`,
    };
  },
};

export const searchContactsTool: AITool = {
  name: 'search_contacts',
  description: 'Search for contacts by name, email, or company',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results to return' },
    },
    required: ['query'],
  },
  execute: async (params, context) => {
    const limit = params.limit || 10;
    const searchTerm = `%${params.query}%`;

    const contacts = await dbAll(
      `SELECT id, first_name, last_name, email, phone, company, title
       FROM contacts
       WHERE user_id = ? AND (
         first_name LIKE ? OR
         last_name LIKE ? OR
         email LIKE ? OR
         company LIKE ?
       )
       LIMIT ?`,
      [context.userId, searchTerm, searchTerm, searchTerm, searchTerm, limit]
    );

    return {
      success: true,
      count: contacts.length,
      contacts: contacts,
    };
  },
};

// =====================================================
// DEAL TOOLS
// =====================================================

export const createDealTool: AITool = {
  name: 'create_deal',
  description: 'Create a new deal/opportunity',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Deal name' },
      value: { type: 'number', description: 'Deal value in USD' },
      stage: { type: 'string', description: 'Deal stage (Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost)' },
      contactId: { type: 'number', description: 'Associated contact ID' },
      expectedCloseDate: { type: 'string', description: 'Expected close date (YYYY-MM-DD)' },
      probability: { type: 'number', description: 'Win probability (0-100)' },
    },
    required: ['name', 'value'],
  },
  execute: async (params, context) => {
    const result = await dbRun(
      `INSERT INTO deals (
        user_id, name, value, stage, contact_id, expected_close_date, probability, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        context.userId,
        params.name,
        params.value,
        params.stage || 'Lead',
        params.contactId || null,
        params.expectedCloseDate || null,
        params.probability || 50,
      ]
    );

    return {
      success: true,
      dealId: result.lastID,
      message: `Deal "${params.name}" created with value $${params.value}`,
    };
  },
};

export const updateDealStageTool: AITool = {
  name: 'update_deal_stage',
  description: 'Move a deal to a different stage',
  parameters: {
    type: 'object',
    properties: {
      dealId: { type: 'number', description: 'Deal ID' },
      stage: { type: 'string', description: 'New stage' },
      probability: { type: 'number', description: 'Updated win probability' },
    },
    required: ['dealId', 'stage'],
  },
  execute: async (params, context) => {
    await dbRun(
      `UPDATE deals SET stage = ?, probability = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [params.stage, params.probability || null, params.dealId, context.userId]
    );

    return {
      success: true,
      message: `Deal moved to ${params.stage}`,
    };
  },
};

// =====================================================
// TASK TOOLS
// =====================================================

export const createTaskTool: AITool = {
  name: 'create_task',
  description: 'Create a new task or reminder',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title' },
      description: { type: 'string', description: 'Task description' },
      dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
      priority: { type: 'string', description: 'Priority (Low, Medium, High, Urgent)' },
      contactId: { type: 'number', description: 'Related contact ID' },
      dealId: { type: 'number', description: 'Related deal ID' },
    },
    required: ['title'],
  },
  execute: async (params, context) => {
    const result = await dbRun(
      `INSERT INTO tasks (
        user_id, title, description, due_date, priority, contact_id, deal_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', datetime('now'), datetime('now'))`,
      [
        context.userId,
        params.title,
        params.description || null,
        params.dueDate || null,
        params.priority || 'Medium',
        params.contactId || null,
        params.dealId || null,
      ]
    );

    return {
      success: true,
      taskId: result.lastID,
      message: `Task "${params.title}" created`,
    };
  },
};

export const completeTaskTool: AITool = {
  name: 'complete_task',
  description: 'Mark a task as completed',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'number', description: 'Task ID' },
    },
    required: ['taskId'],
  },
  execute: async (params, context) => {
    await dbRun(
      `UPDATE tasks SET status = 'Completed', completed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [params.taskId, context.userId]
    );

    return {
      success: true,
      message: `Task marked as completed`,
    };
  },
};

// =====================================================
// EMAIL TOOLS
// =====================================================

export const sendEmailTool: AITool = {
  name: 'send_email',
  description: 'Send an email to a contact',
  parameters: {
    type: 'object',
    properties: {
      contactId: { type: 'number', description: 'Contact ID to email' },
      to: { type: 'string', description: 'Recipient email (if not using contactId)' },
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Email body (HTML or plain text)' },
      cc: { type: 'string', description: 'CC recipients' },
      bcc: { type: 'string', description: 'BCC recipients' },
    },
    required: ['subject', 'body'],
  },
  execute: async (params, context) => {
    // Get contact email if contactId provided
    let toEmail = params.to;
    if (params.contactId) {
      const contact = await dbGet(
        'SELECT email FROM contacts WHERE id = ? AND user_id = ?',
        [params.contactId, context.userId]
      );
      toEmail = contact?.email;
    }

    if (!toEmail) {
      throw new Error('No recipient email address provided');
    }

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, log the email to database
    const result = await dbRun(
      `INSERT INTO emails (
        user_id, contact_id, to_email, subject, body, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'queued', datetime('now'))`,
      [context.userId, params.contactId || null, toEmail, params.subject, params.body]
    );

    return {
      success: true,
      emailId: result.lastID,
      message: `Email queued to ${toEmail}`,
      note: 'Email integration pending - email logged to database',
    };
  },
};

// =====================================================
// DATA QUERY TOOLS
// =====================================================

export const getDashboardStatsTool: AITool = {
  name: 'get_dashboard_stats',
  description: 'Get CRM dashboard statistics',
  parameters: {
    type: 'object',
    properties: {
      period: { type: 'string', description: 'Time period (day, week, month, year)' },
    },
    required: [],
  },
  execute: async (params, context) => {
    const [contactCount] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM contacts WHERE user_id = ?', [context.userId]),
    ]);

    const [dealCount] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM deals WHERE user_id = ?', [context.userId]),
    ]);

    const [dealValue] = await Promise.all([
      dbGet('SELECT SUM(value) as total FROM deals WHERE user_id = ? AND stage != "Closed Lost"', [context.userId]),
    ]);

    const [openTasks] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = "Open"', [context.userId]),
    ]);

    return {
      success: true,
      stats: {
        totalContacts: contactCount?.count || 0,
        totalDeals: dealCount?.count || 0,
        pipelineValue: dealValue?.total || 0,
        openTasks: openTasks?.count || 0,
      },
    };
  },
};

export const getUpcomingTasksTool: AITool = {
  name: 'get_upcoming_tasks',
  description: 'Get upcoming tasks and deadlines',
  parameters: {
    type: 'object',
    properties: {
      days: { type: 'number', description: 'Number of days to look ahead' },
      limit: { type: 'number', description: 'Max tasks to return' },
    },
    required: [],
  },
  execute: async (params, context) => {
    const days = params.days || 7;
    const limit = params.limit || 20;

    const tasks = await dbAll(
      `SELECT t.*, c.first_name, c.last_name, d.name as deal_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN deals d ON t.deal_id = d.id
       WHERE t.user_id = ? AND t.status = 'Open'
       AND t.due_date BETWEEN date('now') AND date('now', '+${days} days')
       ORDER BY t.due_date ASC, t.priority DESC
       LIMIT ?`,
      [context.userId, limit]
    );

    return {
      success: true,
      count: tasks.length,
      tasks: tasks,
    };
  },
};

// =====================================================
// WEB SEARCH TOOLS
// =====================================================

export const webSearchTool: AITool = {
  name: 'web_search',
  description: 'Search the web for information using Google search. Useful for finding current information, company details, news, etc.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      numResults: { type: 'number', description: 'Number of results to return (1-10)' },
    },
    required: ['query'],
  },
  execute: async (params, context) => {
    const serperApiKey = process.env.SERPER_API_KEY;

    if (!serperApiKey) {
      return {
        success: false,
        error: 'Web search not configured (SERPER_API_KEY missing)',
      };
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: params.query,
          num: params.numResults || 5,
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(`Serper API error: ${data.error || response.statusText}`);
      }

      const results = data.organic?.slice(0, params.numResults || 5).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      })) || [];

      return {
        success: true,
        query: params.query,
        results: results,
        count: results.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// =====================================================
// ACTIVITY/NOTE TOOLS
// =====================================================

export const createNoteTool: AITool = {
  name: 'create_note',
  description: 'Add a note to a contact or deal',
  parameters: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Note content' },
      contactId: { type: 'number', description: 'Related contact ID' },
      dealId: { type: 'number', description: 'Related deal ID' },
    },
    required: ['content'],
  },
  execute: async (params, context) => {
    const result = await dbRun(
      `INSERT INTO notes (
        user_id, content, contact_id, deal_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        context.userId,
        params.content,
        params.contactId || null,
        params.dealId || null,
      ]
    );

    return {
      success: true,
      noteId: result.lastID,
      message: 'Note created successfully',
    };
  },
};

export const getContactDetailsTool: AITool = {
  name: 'get_contact_details',
  description: 'Get detailed information about a specific contact',
  parameters: {
    type: 'object',
    properties: {
      contactId: { type: 'number', description: 'Contact ID' },
    },
    required: ['contactId'],
  },
  execute: async (params, context) => {
    const contact = await dbGet(
      `SELECT * FROM contacts WHERE id = ? AND user_id = ?`,
      [params.contactId, context.userId]
    );

    if (!contact) {
      return {
        success: false,
        error: 'Contact not found',
      };
    }

    // Get related deals
    const deals = await dbAll(
      `SELECT * FROM deals WHERE contact_id = ? AND user_id = ?`,
      [params.contactId, context.userId]
    );

    // Get recent activities
    const activities = await dbAll(
      `SELECT * FROM activities WHERE contact_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [params.contactId, context.userId]
    );

    // Get tasks
    const tasks = await dbAll(
      `SELECT * FROM tasks WHERE contact_id = ? AND user_id = ? AND status = 'Open' ORDER BY due_date ASC`,
      [params.contactId, context.userId]
    );

    return {
      success: true,
      contact: contact,
      deals: deals,
      activities: activities,
      tasks: tasks,
    };
  },
};

// =====================================================
// TOOL REGISTRY
// =====================================================

export const ALL_TOOLS: AITool[] = [
  // Contact tools
  createContactTool,
  updateContactTool,
  searchContactsTool,
  getContactDetailsTool,

  // Deal tools
  createDealTool,
  updateDealStageTool,

  // Task tools
  createTaskTool,
  completeTaskTool,

  // Note tools
  createNoteTool,

  // Email tools
  sendEmailTool,

  // Query tools
  getDashboardStatsTool,
  getUpcomingTasksTool,

  // Web search tools
  webSearchTool,
];

export function getToolByName(name: string): AITool | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}

export function getAllToolDefinitions() {
  return ALL_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters, // Claude API expects "input_schema" not "parameters"
  }));
}
