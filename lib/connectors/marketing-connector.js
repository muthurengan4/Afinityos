import { BaseConnector } from './base-connector';

/**
 * Marketing Connector
 * Bridges to the external Marketing CRM (project: crm-automation-ref).
 */
export class MarketingConnector extends BaseConnector {
  constructor() {
    super({
      id: 'marketing',
      name: 'Marketing CRM',
      description: 'External Marketing CRM (project: crm-automation-ref). Campaigns, channels and content.',
      envKey: 'CRM_AUTOMATION_REF',
      icon: 'Megaphone',
      category: 'marketing',
    });
    this.healthPath = '/api/health';
    this.tools = [
      {
        name: 'create_campaign',
        description: 'Create a new marketing campaign across one or more channels.',
        parameters: {
          type: 'object', required: ['name', 'channels'],
          properties: {
            name: { type: 'string' },
            channels: { type: 'array', items: { type: 'string', enum: ['email', 'sms', 'whatsapp', 'linkedin'] } },
            audienceQuery: { type: 'string', description: 'Segment expression e.g. "plan:enterprise AND health<60"' },
            startAt: { type: 'string', format: 'date-time' },
            budget: { type: 'number' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/campaigns', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'send_email',
        description: 'Send a transactional or campaign email immediately.',
        parameters: {
          type: 'object', required: ['to', 'subject', 'body'],
          properties: {
            to: { type: 'array', items: { type: 'string', format: 'email' } },
            subject: { type: 'string' },
            body: { type: 'string', description: 'HTML or markdown body' },
            templateId: { type: 'string' },
            campaignId: { type: 'string' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/channels/email/send', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'send_whatsapp',
        description: 'Send a WhatsApp template message via the marketing CRM.',
        parameters: {
          type: 'object', required: ['to', 'template'],
          properties: {
            to: { type: 'string', description: 'E.164 phone number' },
            template: { type: 'string' },
            variables: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/channels/whatsapp/send', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'generate_content',
        description: 'Generate marketing copy (subject, body, ad) using the CRM’s AI writer.',
        parameters: {
          type: 'object', required: ['kind', 'prompt'],
          properties: {
            kind: { type: 'string', enum: ['subject', 'email_body', 'ad', 'landing_hero'] },
            prompt: { type: 'string' },
            brandTone: { type: 'string' },
            audience: { type: 'string' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/ai/generate', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'get_campaign_analytics',
        description: 'Retrieve performance metrics for a campaign (opens, CTR, conversions).',
        parameters: {
          type: 'object', required: ['campaignId'],
          properties: {
            campaignId: { type: 'string' },
            window: { type: 'string', enum: ['24h', '7d', '30d', 'all'], default: '7d' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('GET', `/api/campaigns/${p.campaignId}/analytics`, { query: { window: p.window || '7d' }, organizationId: ctx.organizationId }),
      },
    ];
  }

  mockResponse(method, path, body) {
    if (method === 'POST' && path === '/api/campaigns') return { id: `cmp_${Date.now()}`, ...body, status: 'draft', createdAt: new Date().toISOString() };
    if (method === 'POST' && path === '/api/channels/email/send') return { messageId: `eml_${Date.now()}`, to: body?.to, sentAt: new Date().toISOString(), status: 'queued' };
    if (method === 'POST' && path === '/api/channels/whatsapp/send') return { messageId: `wa_${Date.now()}`, to: body?.to, sentAt: new Date().toISOString(), status: 'queued' };
    if (method === 'POST' && path === '/api/ai/generate') return { kind: body?.kind, content: `[MOCK] Generated ${body?.kind} for: ${body?.prompt}` };
    if (method === 'GET' && path.endsWith('/analytics')) return { campaignId: path.split('/')[3], opens: 0, clicks: 0, conversions: 0, openRate: 0, ctr: 0 };
    return null;
  }
}
