import { BaseConnector } from './base-connector';

/**
 * Insurance Connector
 * REST API connector to an external Insurance platform.
 * Tools: generate_quote, purchase_policy, renew_policy, search_policies, claims_status.
 */
export class InsuranceConnector extends BaseConnector {
  constructor() {
    super({
      id: 'insurance',
      name: 'Insurance Platform',
      description: 'External insurance platform (hosted separately). Quotes, policies, renewals, claims.',
      envKey: 'INSURANCE_API',
      icon: 'Shield',
      category: 'insurance',
    });
    this.healthPath = '/v1/health';
    this.tools = [
      {
        name: 'generate_quote',
        description: 'Generate an insurance quote based on policy type and applicant details.',
        parameters: {
          type: 'object', required: ['policyType', 'applicant'],
          properties: {
            policyType: { type: 'string', enum: ['cyber_liability', 'property', 'auto_fleet', 'errors_omissions', 'general_liability'] },
            applicant: {
              type: 'object',
              required: ['name', 'email'],
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                industry: { type: 'string' },
                annualRevenue: { type: 'number' },
                employeeCount: { type: 'integer' },
              },
            },
            coverage: { type: 'object', properties: { amount: { type: 'number' }, deductible: { type: 'number' } } },
            term: { type: 'string', enum: ['monthly', 'annual'], default: 'annual' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/v1/quotes', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'purchase_policy',
        description: 'Purchase a policy from a quote and bind coverage.',
        parameters: {
          type: 'object', required: ['quoteId', 'paymentMethodId'],
          properties: {
            quoteId: { type: 'string' },
            paymentMethodId: { type: 'string' },
            effectiveDate: { type: 'string', format: 'date' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/v1/policies/purchase', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'renew_policy',
        description: 'Renew an existing policy (auto-renew or with updated coverage).',
        parameters: {
          type: 'object', required: ['policyId'],
          properties: {
            policyId: { type: 'string' },
            term: { type: 'string', enum: ['monthly', 'annual'], default: 'annual' },
            coverageOverride: { type: 'object' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', `/v1/policies/${p.policyId}/renew`, { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'search_policies',
        description: 'Search policies by customer, status or policy number.',
        parameters: {
          type: 'object',
          properties: {
            customerEmail: { type: 'string' },
            status: { type: 'string', enum: ['active', 'expired', 'cancelled', 'pending'] },
            policyNumber: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        },
        execute: async (p, conn, ctx) => conn.request('GET', '/v1/policies/search', { query: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'claims_status',
        description: 'Check the status (and history) of a claim.',
        parameters: {
          type: 'object', required: ['claimId'],
          properties: { claimId: { type: 'string' } },
        },
        execute: async (p, conn, ctx) => conn.request('GET', `/v1/claims/${p.claimId}`, { organizationId: ctx.organizationId }),
      },
    ];
  }

  mockResponse(method, path, body) {
    if (method === 'POST' && path === '/v1/quotes') return { quoteId: `q_${Date.now()}`, policyType: body?.policyType, premium: 12400, currency: 'USD', validUntil: new Date(Date.now() + 30 * 86400000).toISOString(), coverage: body?.coverage };
    if (method === 'POST' && path === '/v1/policies/purchase') return { policyId: `pol_${Date.now()}`, policyNumber: `INS-${Date.now()}`, status: 'active', effectiveDate: body?.effectiveDate || new Date().toISOString() };
    if (method === 'POST' && path.endsWith('/renew')) return { policyId: path.split('/')[3], renewalId: `ren_${Date.now()}`, status: 'renewed', term: body?.term };
    if (method === 'GET' && path === '/v1/policies/search') return { results: [], total: 0 };
    if (method === 'GET' && path.startsWith('/v1/claims/')) return { claimId: path.split('/')[3], status: 'under_review', filedAt: new Date(Date.now() - 5 * 86400000).toISOString(), history: [] };
    return null;
  }
}
