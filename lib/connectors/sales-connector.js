import { BaseConnector } from './base-connector';

/**
 * Sales Connector
 * Bridges to the external Sales CRM (project: crm-automation-ref).
 * Exposes AI-callable tools:
 *   create_lead, update_lead, search_lead, move_pipeline, schedule_meeting
 */
export class SalesConnector extends BaseConnector {
  constructor() {
    super({
      id: 'sales',
      name: 'Sales CRM',
      description: 'External Sales CRM (project: crm-automation-ref). Manages leads, deals, pipeline and meetings.',
      envKey: 'CRM_AUTOMATION_REF',
      icon: 'TrendingUp',
      category: 'sales',
      documentation: 'https://crm-automation-ref.docs/api',
    });
    this.healthPath = '/api/';
    this.loginPath = '/api/auth/login';
    this.tools = [
      {
        name: 'create_lead',
        description: 'Create a new lead in the Sales CRM. Use when a customer expresses interest in any product.',
        parameters: {
          type: 'object',
          required: ['firstName', 'lastName', 'email'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            company: { type: 'string' },
            source: { type: 'string', description: 'e.g. website, referral, campaign:expansion-eu' },
            ownerEmail: { type: 'string', description: 'Sales rep email to assign as owner' },
            estimatedValue: { type: 'number' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/leads', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'update_lead',
        description: 'Update fields on an existing lead (status, notes, value, etc.).',
        parameters: {
          type: 'object',
          required: ['leadId'],
          properties: {
            leadId: { type: 'string' },
            status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'unqualified'] },
            notes: { type: 'string' },
            estimatedValue: { type: 'number' },
            nextActionAt: { type: 'string', format: 'date-time' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('PATCH', `/api/leads/${p.leadId}`, { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'search_lead',
        description: 'Search leads by name, email, company or stage. Returns up to 25 results.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Free-text search term' },
            stage: { type: 'string', enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
            ownerEmail: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        },
        execute: async (p, conn, ctx) => conn.request('GET', '/api/leads/search', { query: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'move_pipeline',
        description: 'Move a lead/deal to a different pipeline stage.',
        parameters: {
          type: 'object',
          required: ['leadId', 'toStage'],
          properties: {
            leadId: { type: 'string' },
            toStage: { type: 'string', enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
            reason: { type: 'string' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', `/api/leads/${p.leadId}/move`, { body: { toStage: p.toStage, reason: p.reason }, organizationId: ctx.organizationId }),
      },
      {
        name: 'schedule_meeting',
        description: 'Schedule a meeting between a sales rep and a lead/customer.',
        parameters: {
          type: 'object',
          required: ['leadId', 'when'],
          properties: {
            leadId: { type: 'string' },
            when: { type: 'string', format: 'date-time' },
            durationMin: { type: 'integer', default: 30 },
            attendees: { type: 'array', items: { type: 'string', format: 'email' } },
            agenda: { type: 'string' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', `/api/leads/${p.leadId}/meetings`, { body: p, organizationId: ctx.organizationId }),
      },
    ];
  }

  mockResponse(method, path, body) {
    if (method === 'POST' && path === '/api/leads') return { id: `lead_${Date.now()}`, ...body, stage: 'prospecting', status: 'new', createdAt: new Date().toISOString() };
    if (method === 'PATCH' && path.startsWith('/api/leads/')) return { id: path.split('/')[3], ...body, updatedAt: new Date().toISOString() };
    if (method === 'GET' && path === '/api/leads/search') return { results: [], total: 0 };
    if (method === 'POST' && path.endsWith('/move')) return { id: path.split('/')[3], stage: body.toStage, movedAt: new Date().toISOString() };
    if (method === 'POST' && path.endsWith('/meetings')) return { id: `meet_${Date.now()}`, ...body, status: 'scheduled' };
    return null;
  }
}
