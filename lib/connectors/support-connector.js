import { BaseConnector } from './base-connector';

export class SupportConnector extends BaseConnector {
  constructor() {
    super({
      id: 'support',
      name: 'Support CRM',
      description: 'External Support CRM (project: crm-automation-ref). Tickets, queues, knowledge base.',
      envKey: 'CRM_AUTOMATION_REF',
      icon: 'LifeBuoy',
      category: 'support',
    });
    this.healthPath = '/api/health';
    this.tools = [
      {
        name: 'create_ticket',
        description: 'Open a new support ticket on behalf of a customer.',
        parameters: {
          type: 'object', required: ['subject', 'customerEmail'],
          properties: {
            subject: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
            channel: { type: 'string', enum: ['email', 'chat', 'phone', 'web', 'whatsapp'] },
            customerEmail: { type: 'string', format: 'email' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/tickets', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'update_ticket',
        description: 'Update fields on an existing ticket (status, assignee, priority, notes).',
        parameters: {
          type: 'object', required: ['ticketId'],
          properties: {
            ticketId: { type: 'string' },
            status: { type: 'string', enum: ['open', 'pending', 'on_hold', 'resolved', 'closed'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            assigneeEmail: { type: 'string' },
            note: { type: 'string', description: 'Append an internal note' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('PATCH', `/api/tickets/${p.ticketId}`, { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'resolve_ticket',
        description: 'Resolve a ticket with a resolution summary visible to the customer.',
        parameters: {
          type: 'object', required: ['ticketId', 'resolution'],
          properties: {
            ticketId: { type: 'string' },
            resolution: { type: 'string' },
            notifyCustomer: { type: 'boolean', default: true },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', `/api/tickets/${p.ticketId}/resolve`, { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'search_knowledge_base',
        description: 'Search the support knowledge base for an answer to a customer question.',
        parameters: {
          type: 'object', required: ['query'],
          properties: {
            query: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
            category: { type: 'string' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('GET', '/api/kb/search', { query: p, organizationId: ctx.organizationId }),
      },
    ];
  }

  mockResponse(method, path, body) {
    if (method === 'POST' && path === '/api/tickets') return { id: `tkt_${Date.now()}`, ref: `T-${Math.floor(Math.random() * 90000) + 10000}`, ...body, status: 'open', createdAt: new Date().toISOString() };
    if (method === 'PATCH' && path.startsWith('/api/tickets/')) return { id: path.split('/')[3], ...body, updatedAt: new Date().toISOString() };
    if (method === 'POST' && path.endsWith('/resolve')) return { id: path.split('/')[3], status: 'resolved', resolvedAt: new Date().toISOString(), resolution: body?.resolution };
    if (method === 'GET' && path === '/api/kb/search') return { results: [], total: 0 };
    return null;
  }
}
