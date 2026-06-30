import { BaseConnector } from './base-connector';

/**
 * Rewards Connector
 * Bridges to the external Rewards platform (project: point-vault).
 */
export class RewardsConnector extends BaseConnector {
  constructor() {
    super({
      id: 'rewards',
      name: 'Rewards (point-vault)',
      description: 'External Rewards platform (project: point-vault). Points, tiers, referrals.',
      envKey: 'POINT_VAULT',
      icon: 'Gift',
      category: 'rewards',
    });
    this.healthPath = '/api/health';
    this.loginPath = '/api/auth/login';
    this.tools = [
      {
        name: 'award_points',
        description: 'Award loyalty points to a customer for an action (purchase, referral, milestone).',
        parameters: {
          type: 'object', required: ['customerId', 'points', 'reason'],
          properties: {
            customerId: { type: 'string' },
            points: { type: 'integer', minimum: 1 },
            reason: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/points/award', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'redeem_points',
        description: 'Redeem a customer’s points for a perk/reward.',
        parameters: {
          type: 'object', required: ['customerId', 'rewardId'],
          properties: {
            customerId: { type: 'string' },
            rewardId: { type: 'string', description: 'Catalog reward id' },
            quantity: { type: 'integer', default: 1 },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/points/redeem', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'referral_campaign',
        description: 'Create or extend a referral campaign with a reward structure.',
        parameters: {
          type: 'object', required: ['name'],
          properties: {
            name: { type: 'string' },
            referrerReward: { type: 'integer' },
            refereeReward: { type: 'integer' },
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' },
          },
        },
        execute: async (p, conn, ctx) => conn.request('POST', '/api/referrals/campaigns', { body: p, organizationId: ctx.organizationId }),
      },
      {
        name: 'customer_rewards',
        description: 'Get a customer’s rewards profile: balance, tier, lifetime points, perks, recent history.',
        parameters: {
          type: 'object', required: ['customerId'],
          properties: { customerId: { type: 'string' } },
        },
        execute: async (p, conn, ctx) => conn.request('GET', `/api/customers/${p.customerId}/rewards`, { organizationId: ctx.organizationId }),
      },
    ];
  }

  mockResponse(method, path, body) {
    if (method === 'POST' && path === '/api/points/award') return { txId: `tx_${Date.now()}`, customerId: body?.customerId, awarded: body?.points, newBalance: 10000, awardedAt: new Date().toISOString() };
    if (method === 'POST' && path === '/api/points/redeem') return { txId: `tx_${Date.now()}`, customerId: body?.customerId, rewardId: body?.rewardId, newBalance: 8500, redeemedAt: new Date().toISOString() };
    if (method === 'POST' && path === '/api/referrals/campaigns') return { id: `ref_${Date.now()}`, ...body, status: 'active' };
    if (method === 'GET' && path.includes('/rewards')) return { customerId: path.split('/')[3], tier: 'Gold', pointsBalance: 8420, lifetimePoints: 24800, perks: ['Priority support'], history: [] };
    return null;
  }
}
