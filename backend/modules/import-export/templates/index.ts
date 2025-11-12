/**
 * Import/Export Module Templates
 * 10 example templates for data import/export operations
 */

// 1. Contact Import Template (CSV)
export const contactImportCSVTemplate = {
  id: 'contact-import-csv',
  name: 'Contact Import CSV',
  fileType: 'csv',
  entityType: 'contact',
  requiredFields: ['email', 'first_name', 'last_name'],
  optionalFields: ['phone', 'company', 'title', 'address'],
  example: 'first_name,last_name,email,phone,company\nJohn,Doe,john@example.com,555-1234,Acme Corp',
};

// 2. Deal Export Template (Excel)
export const dealExportExcelTemplate = {
  id: 'deal-export-excel',
  name: 'Deal Export Excel',
  fileType: 'xlsx',
  entityType: 'deal',
  fields: ['deal_name', 'value', 'stage', 'probability', 'expected_close_date', 'owner'],
  filters: { stage: ['active'], value: { min: 0 } },
  example: 'Exports all active deals with metadata',
};

// 3. Account Import Template (JSON)
export const accountImportJSONTemplate = {
  id: 'account-import-json',
  name: 'Account Import JSON',
  fileType: 'json',
  entityType: 'account',
  schema: {
    company_name: 'string',
    industry: 'string',
    employees: 'number',
    annual_revenue: 'number',
    website: 'url',
  },
  example: { company_name: 'TechCorp', industry: 'Software', employees: 500, annual_revenue: 5000000 },
};

// 4. Activity Log Export Template (CSV)
export const activityExportCSVTemplate = {
  id: 'activity-export-csv',
  name: 'Activity Export CSV',
  fileType: 'csv',
  entityType: 'activity',
  fields: ['timestamp', 'type', 'user', 'entity', 'description'],
  dateRange: { from: '2025-01-01', to: '2025-12-31' },
  example: '2025-11-18T10:30:00Z,deal.stage_changed,Sarah,deal-123,Moved to Proposal',
};

// 5. Bulk Contact Update Template (CSV)
export const bulkContactUpdateTemplate = {
  id: 'bulk-contact-update',
  name: 'Bulk Contact Update CSV',
  fileType: 'csv',
  operation: 'update',
  entityType: 'contact',
  identifierField: 'email',
  updateableFields: ['phone', 'company', 'title', 'tags'],
  example: 'email,phone,company\njohn@example.com,555-9999,New Company Inc',
};

// 6. Pipeline Export Template (JSON)
export const pipelineExportJSONTemplate = {
  id: 'pipeline-export-json',
  name: 'Pipeline Export JSON',
  fileType: 'json',
  entityType: 'pipeline',
  includeStages: true,
  includeDeals: true,
  example: { pipeline_name: 'Sales Pipeline', stages: [{name: 'Lead'}, {name: 'Qualified'}], deals_count: 45 },
};

// 7. Email Campaign Import Template (CSV)
export const emailCampaignImportTemplate = {
  id: 'email-campaign-import',
  name: 'Email Campaign Import CSV',
  fileType: 'csv',
  entityType: 'email_campaign',
  requiredFields: ['recipient_email', 'campaign_id'],
  optionalFields: ['first_name', 'company', 'personalization_data'],
  example: 'recipient_email,campaign_id,first_name\njane@example.com,camp_001,Jane',
};

// 8. Task Bulk Export Template (Excel)
export const taskBulkExportTemplate = {
  id: 'task-bulk-export',
  name: 'Task Bulk Export Excel',
  fileType: 'xlsx',
  entityType: 'task',
  fields: ['title', 'assignee', 'due_date', 'priority', 'status', 'related_to'],
  filters: { status: ['pending', 'in_progress'] },
  example: 'Follow up with client,john@example.com,2025-12-01,high,pending,contact-789',
};

// 9. Custom Field Migration Template (JSON)
export const customFieldMigrationTemplate = {
  id: 'custom-field-migration',
  name: 'Custom Field Migration JSON',
  fileType: 'json',
  operation: 'migrate',
  sourceSystem: 'legacy_crm',
  targetSystem: 'clientforge',
  fieldMapping: {
    old_field_1: 'new_field_1',
    old_field_2: 'new_field_2',
  },
  example: { entity: 'contact', mappings: [{source: 'cust_id', target: 'custom_field_001'}] },
};

// 10. Full Database Backup Template (SQL)
export const databaseBackupTemplate = {
  id: 'database-backup',
  name: 'Full Database Backup',
  fileType: 'sql',
  operation: 'backup',
  includes: ['contacts', 'accounts', 'deals', 'tasks', 'custom_fields', 'activities'],
  compression: 'gzip',
  encryption: 'AES-256',
  example: 'Creates encrypted backup of entire CRM database',
};

// Export all templates
export const importExportTemplates = [
  contactImportCSVTemplate,
  dealExportExcelTemplate,
  accountImportJSONTemplate,
  activityExportCSVTemplate,
  bulkContactUpdateTemplate,
  pipelineExportJSONTemplate,
  emailCampaignImportTemplate,
  taskBulkExportTemplate,
  customFieldMigrationTemplate,
  databaseBackupTemplate,
];
