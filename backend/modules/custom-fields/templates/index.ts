/**
 * Custom Fields Module Templates
 * 10 example field templates for dynamic CRM customization
 */

// 1. Text Field Template
export const textFieldTemplate = {
  id: 'text-field',
  name: 'Single Line Text',
  fieldType: 'text',
  validation: { maxLength: 255, minLength: 0 },
  example: { label: 'Company Website', value: 'https://example.com' },
};

// 2. Long Text / Textarea Template
export const longTextFieldTemplate = {
  id: 'long-text-field',
  name: 'Multi-Line Text',
  fieldType: 'textarea',
  validation: { maxLength: 5000 },
  example: { label: 'Deal Notes', value: 'Customer showed interest in...' },
};

// 3. Number Field Template
export const numberFieldTemplate = {
  id: 'number-field',
  name: 'Number',
  fieldType: 'number',
  validation: { min: 0, max: 1000000, decimals: 2 },
  example: { label: 'Annual Revenue', value: 50000.00 },
};

// 4. Currency Field Template
export const currencyFieldTemplate = {
  id: 'currency-field',
  name: 'Currency',
  fieldType: 'currency',
  validation: { currency: 'USD', min: 0 },
  example: { label: 'Deal Value', value: 125000, currency: 'USD' },
};

// 5. Date Field Template
export const dateFieldTemplate = {
  id: 'date-field',
  name: 'Date',
  fieldType: 'date',
  validation: { format: 'YYYY-MM-DD' },
  example: { label: 'Contract Start Date', value: '2025-12-01' },
};

// 6. Dropdown / Select Field Template
export const dropdownFieldTemplate = {
  id: 'dropdown-field',
  name: 'Dropdown Select',
  fieldType: 'select',
  options: ['Hot', 'Warm', 'Cold'],
  example: { label: 'Lead Temperature', value: 'Warm', options: ['Hot', 'Warm', 'Cold'] },
};

// 7. Multi-Select Field Template
export const multiSelectFieldTemplate = {
  id: 'multi-select-field',
  name: 'Multi-Select',
  fieldType: 'multi-select',
  options: ['Enterprise', 'Mid-Market', 'SMB', 'Startup'],
  example: { label: 'Target Segments', value: ['Enterprise', 'Mid-Market'] },
};

// 8. Checkbox / Boolean Field Template
export const checkboxFieldTemplate = {
  id: 'checkbox-field',
  name: 'Checkbox',
  fieldType: 'boolean',
  defaultValue: false,
  example: { label: 'Existing Customer', value: true },
};

// 9. Email Field Template
export const emailFieldTemplate = {
  id: 'email-field',
  name: 'Email Address',
  fieldType: 'email',
  validation: { format: 'email' },
  example: { label: 'Secondary Email', value: 'contact@company.com' },
};

// 10. URL Field Template
export const urlFieldTemplate = {
  id: 'url-field',
  name: 'URL',
  fieldType: 'url',
  validation: { format: 'url' },
  example: { label: 'LinkedIn Profile', value: 'https://linkedin.com/in/example' },
};

// Export all templates
export const customFieldTemplates = [
  textFieldTemplate,
  longTextFieldTemplate,
  numberFieldTemplate,
  currencyFieldTemplate,
  dateFieldTemplate,
  dropdownFieldTemplate,
  multiSelectFieldTemplate,
  checkboxFieldTemplate,
  emailFieldTemplate,
  urlFieldTemplate,
];

// Template usage example
export const exampleUsage = {
  entityType: 'contact',
  fields: [
    { ...textFieldTemplate, id: 'cf_001', label: 'Job Title' },
    { ...dropdownFieldTemplate, id: 'cf_002', label: 'Lead Source' },
    { ...currencyFieldTemplate, id: 'cf_003', label: 'Lifetime Value' },
  ],
};
