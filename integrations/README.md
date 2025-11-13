# Integrations Directory

This directory is reserved for third-party service integrations.

## Policy

- **Do not create empty placeholder directories** for future integrations
- Only create integration subdirectories when you have actual implementation code
- Each integration should follow the structure:
  ```
  integrations/<category>/<service-name>/
  ├── README.md           # Integration overview and setup
  ├── adapter.ts          # Service adapter implementation
  ├── types.ts            # TypeScript interfaces
  ├── config.ts           # Configuration schema
  └── __tests__/          # Integration tests
  ```

## Categories

- `ai-services/` - AI/ML service integrations (Anthropic, OpenAI, etc.)
- `analytics/` - Analytics platforms (Google Analytics, Mixpanel, etc.)
- `communication/` - Communication services (Email, SMS, Messaging)
- `crm/` - CRM system integrations (HubSpot, Salesforce, etc.)
- `payment/` - Payment processors (Stripe, PayPal, etc.)
- `productivity/` - Productivity tools (Calendar, Storage, Project Management)
- `webhooks/` - Webhook handlers and processors

## Adding New Integrations

1. Create the integration directory structure when you start implementing
2. Add tests before merging
3. Update this README with the new integration
4. Add configuration to `.env.example`

## Current Integrations

*No integrations currently implemented - all are in planning phase*

---

**Note**: This directory was cleaned in FS-4 (2025-11-12) to remove 32 empty placeholder directories.
Future integrations should only be scaffolded when implementation begins.
