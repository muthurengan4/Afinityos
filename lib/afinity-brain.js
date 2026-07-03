/**
 * AfinityOS Business Brain — OpenAI GPT-5 client + read-only tool definitions.
 *
 * The Brain is scoped to a single organization. Every tool implementation
 * MUST filter by `organizationId` so the model can never leak cross-tenant data.
 * All tools are READ-ONLY (no inserts/updates/deletes).
 */
import OpenAI from 'openai';
import { getDb } from './db.js';

let _openai = null;
export function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured on server.');
  }
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export const BUSINESS_BRAIN_MODEL = 'gpt-5';

// ---------- Tool schemas (fed to GPT-5) ----------
export const BRAIN_TOOLS = [
  {
    type: 'function',
    name: 'get_org_snapshot',
    description: 'High-level snapshot of the current organization: counts of customers, deals, tickets, campaigns, rewards balances, policies, and recent events. Use this FIRST when the user asks a broad question.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'search_customers',
    description: 'Search customers by name, email, segment, or status. Returns up to 20 matching customers with basic fields and lifetime value.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Substring to match against name, email, or company.' },
        segment: { type: 'string', description: 'Optional segment filter (e.g. "enterprise", "smb").' },
        status: { type: 'string', description: 'Optional status filter (e.g. "active", "at_risk", "churned").' },
        limit: { type: 'integer', description: 'Max rows (1–50). Default 20.' },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: 'get_customer_360',
    description: 'Get a single customer\'s full 360 profile: timeline, deals, tickets, campaigns received, rewards balance, and policies.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'The customer ID.' },
        email: { type: 'string', description: 'OR match by email if id unknown.' },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: 'get_sales_pipeline',
    description: 'Aggregate pipeline: total open value, weighted forecast, stage-by-stage breakdown, top 10 open deals.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'get_support_summary',
    description: 'Support state: open ticket counts by priority + SLA breach count + top 5 recent tickets.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'get_marketing_summary',
    description: 'Campaign performance across the last 30 days: active campaigns, sends, open rate, CTR, MQLs.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'get_rewards_summary',
    description: 'Loyalty program state: total points issued/redeemed, top redeemers, expiring points, tier distribution.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'get_insurance_summary',
    description: 'Insurance book of business: active policies count, gross written premium, claims count, top policy types.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'get_recent_events',
    description: 'Return the most recent 30 event-bus events for this organization (customer.created, deal.won, etc.).',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Optional event type filter.' },
        limit: { type: 'integer', description: 'Max rows (default 30).' },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: 'get_connector_status',
    description: 'Which external systems (Sales CRM, Marketing, Support, Rewards, Insurance) are configured, live, or in mock mode + count of recent tool calls.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
];

// ---------- Tool implementations (each is org-scoped) ----------
function toArr(cursor, limit = 100) {
  return cursor.limit(limit).toArray().then((rows) => rows.map((r) => { const { _id, ...rest } = r; return rest; }));
}

async function summarizeCollection(orgId, coll, filter = {}) {
  const db = await getDb();
  return db.collection(coll).countDocuments({ organizationId: orgId, ...filter });
}

const impl = {
  get_org_snapshot: async (orgId) => {
    const db = await getDb();
    const [customers, deals, tickets, campaigns, policies, events] = await Promise.all([
      summarizeCollection(orgId, 'customers'),
      summarizeCollection(orgId, 'deals'),
      summarizeCollection(orgId, 'tickets'),
      summarizeCollection(orgId, 'campaigns'),
      summarizeCollection(orgId, 'policies'),
      summarizeCollection(orgId, 'events'),
    ]);
    const rewardsAgg = await db.collection('customers').aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: null, totalPoints: { $sum: { $ifNull: ['$rewards.balance', 0] } } } },
    ]).toArray();
    return {
      counts: { customers, deals, tickets, campaigns, policies, recentEvents: events },
      totalRewardPoints: rewardsAgg[0]?.totalPoints || 0,
    };
  },

  search_customers: async (orgId, args = {}) => {
    const db = await getDb();
    const q = { organizationId: orgId };
    if (args.query) {
      const re = new RegExp(args.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: re }, { email: re }, { company: re }];
    }
    if (args.segment) q.segment = args.segment;
    if (args.status) q.status = args.status;
    const rows = await toArr(db.collection('customers').find(q).sort({ updatedAt: -1 }), Math.min(args.limit || 20, 50));
    return { count: rows.length, customers: rows.map((c) => ({
      id: c.id, name: c.name, email: c.email, company: c.company,
      segment: c.segment, status: c.status, lifetimeValue: c.lifetimeValue, tier: c.tier,
    })) };
  },

  get_customer_360: async (orgId, args = {}) => {
    const db = await getDb();
    const q = { organizationId: orgId };
    if (args.customerId) q.id = args.customerId;
    else if (args.email) q.email = args.email;
    else return { error: 'Provide customerId or email.' };
    const customer = await db.collection('customers').findOne(q);
    if (!customer) return { error: 'Customer not found in this organization.' };
    const { _id, ...c } = customer;
    return { customer: c };
  },

  get_sales_pipeline: async (orgId) => {
    const db = await getDb();
    const deals = await toArr(db.collection('deals').find({ organizationId: orgId }), 500);
    const openDeals = deals.filter((d) => !['won', 'lost', 'closed_lost', 'closed_won'].includes((d.stage || '').toLowerCase()));
    const byStage = openDeals.reduce((acc, d) => {
      const s = d.stage || 'unknown';
      acc[s] = acc[s] || { stage: s, count: 0, value: 0 };
      acc[s].count += 1;
      acc[s].value += Number(d.value) || 0;
      return acc;
    }, {});
    const top10 = [...openDeals].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 10);
    const totalValue = openDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const weighted = openDeals.reduce((s, d) => s + (Number(d.value) || 0) * ((d.probability || 0) / 100), 0);
    return {
      totalPipelineValue: totalValue, weightedForecast: Math.round(weighted),
      openCount: openDeals.length, stageBreakdown: Object.values(byStage),
      topDeals: top10.map((d) => ({ id: d.id, name: d.name, value: d.value, stage: d.stage, probability: d.probability, owner: d.owner })),
    };
  },

  get_support_summary: async (orgId) => {
    const db = await getDb();
    const tickets = await toArr(db.collection('tickets').find({ organizationId: orgId }), 500);
    const open = tickets.filter((t) => ['open', 'pending', 'in_progress'].includes((t.status || '').toLowerCase()));
    const byPriority = open.reduce((acc, t) => { const p = t.priority || 'normal'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    const slaBreached = open.filter((t) => t.slaBreached === true).length;
    const recent = tickets.slice(-5).map((t) => ({ id: t.id, subject: t.subject, priority: t.priority, status: t.status, age: t.ageHours }));
    return { openCount: open.length, byPriority, slaBreached, recentTickets: recent };
  },

  get_marketing_summary: async (orgId) => {
    const db = await getDb();
    const camps = await toArr(db.collection('campaigns').find({ organizationId: orgId }), 200);
    const active = camps.filter((c) => (c.status || '').toLowerCase() === 'active' || c.status === 'live');
    const totalSent = camps.reduce((s, c) => s + (c.sent || 0), 0);
    const avgOpen = camps.length ? Math.round(camps.reduce((s, c) => s + (c.openRate || 0), 0) / camps.length) : 0;
    const avgCtr = camps.length ? +(camps.reduce((s, c) => s + (c.ctr || 0), 0) / camps.length).toFixed(2) : 0;
    return { activeCount: active.length, totalCampaigns: camps.length, totalSent, avgOpenRate: avgOpen, avgCtr };
  },

  get_rewards_summary: async (orgId) => {
    const db = await getDb();
    const customers = await toArr(db.collection('customers').find({ organizationId: orgId, 'rewards.balance': { $gt: 0 } }), 500);
    const totalBalance = customers.reduce((s, c) => s + (c.rewards?.balance || 0), 0);
    const topRedeemers = [...customers].sort((a, b) => (b.rewards?.redeemed || 0) - (a.rewards?.redeemed || 0)).slice(0, 5)
      .map((c) => ({ id: c.id, name: c.name, points: c.rewards?.balance, redeemed: c.rewards?.redeemed, tier: c.rewards?.tier }));
    const byTier = customers.reduce((acc, c) => { const t = c.rewards?.tier || 'bronze'; acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    return { activeMembers: customers.length, totalPointsBalance: totalBalance, tierDistribution: byTier, topRedeemers };
  },

  get_insurance_summary: async (orgId) => {
    const db = await getDb();
    const policies = await toArr(db.collection('policies').find({ organizationId: orgId }), 500);
    const active = policies.filter((p) => (p.status || '').toLowerCase() === 'active');
    const gwp = active.reduce((s, p) => s + (Number(p.premium) || 0), 0);
    const byType = active.reduce((acc, p) => { const t = p.type || 'other'; acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    const claimsCount = policies.reduce((s, p) => s + (p.claims?.length || 0), 0);
    return { activePolicies: active.length, grossWrittenPremium: gwp, claimsCount, byType };
  },

  get_recent_events: async (orgId, args = {}) => {
    const db = await getDb();
    const q = { organizationId: orgId };
    if (args.type) q.type = args.type;
    const rows = await toArr(db.collection('events').find(q).sort({ timestamp: -1 }), Math.min(args.limit || 30, 100));
    return { count: rows.length, events: rows.map((e) => ({ type: e.type, timestamp: e.timestamp, payload: e.payload })) };
  },

  get_connector_status: async (orgId) => {
    const db = await getDb();
    const [configs, calls] = await Promise.all([
      db.collection('connector_configs').find({ organizationId: orgId }).toArray(),
      db.collection('connector_calls').find({ organizationId: orgId }).sort({ timestamp: -1 }).limit(100).toArray(),
    ]);
    const connectors = configs.map((cfg) => ({
      connectorId: cfg.connectorId,
      configured: !!(cfg.baseUrl && (cfg.apiKey || (cfg.serviceEmail && cfg.servicePassword))),
      baseUrl: cfg.baseUrl || null,
      hasApiKey: !!cfg.apiKey, hasServiceCreds: !!(cfg.serviceEmail && cfg.servicePassword),
    }));
    const recentCallStats = calls.reduce((acc, c) => {
      acc.total += 1;
      acc.live += c.mode === 'live' ? 1 : 0;
      acc.mock += c.mode === 'mock' ? 1 : 0;
      acc.ok += c.ok ? 1 : 0;
      return acc;
    }, { total: 0, live: 0, mock: 0, ok: 0 });
    return { connectors, recentCallStats };
  },
};

/** Execute a tool call by name. Always org-scoped. */
export async function runBrainTool(name, orgId, args) {
  const fn = impl[name];
  if (!fn) return { error: `Unknown tool: ${name}` };
  try {
    return await fn(orgId, args);
  } catch (e) {
    return { error: `Tool ${name} failed: ${e.message}` };
  }
}

export const BRAIN_SYSTEM_PROMPT = `You are AfinityAI — the executive business brain for the AfinityOS enterprise operating system.

Your job is to help a CEO / Admin instantly understand the state of their business across:
  • Sales pipeline & deals
  • Marketing campaigns
  • Support tickets
  • Rewards & loyalty program
  • Insurance book of business
  • Customer360 profiles
  • Recent event-bus activity
  • Connected external systems (CRM, Point Vault, Insurtech)

You have access to READ-ONLY tools that query the organization's own data. USE THEM.

Rules:
1. If the question is broad ("how are we doing?", "give me a status") → call get_org_snapshot first, then drill in with the domain-specific tools.
2. If the question is domain-specific → jump straight to that tool.
3. NEVER invent numbers. If a tool returns nothing, say so explicitly.
4. Present numbers concisely with clear headings, bullet lists, and short tables (markdown OK).
5. Highlight risks in bold (e.g. **SLA breaches: 3**, **at-risk customers: 12**) and end with a "Recommended next actions" section (2-4 bullets).
6. Never disclose org IDs, user IDs, raw MongoDB documents, or system-internal fields.
7. You are strictly scoped to the CURRENT organization; you cannot see other tenants.
`;
