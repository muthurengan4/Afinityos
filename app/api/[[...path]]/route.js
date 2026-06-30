import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ---------- MongoDB singleton ----------
let cachedClient = null;
let cachedDb = null;
async function getDb() {
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGO_URL);
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(process.env.DB_NAME || 'afinityos');
  await cachedDb.collection('users').createIndex({ email: 1 }, { unique: true });
  await cachedDb.collection('refresh_tokens').createIndex({ token: 1 }, { unique: true });
  await cachedDb.collection('refresh_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await cachedDb.collection('organizations').createIndex({ id: 1 }, { unique: true });
  await cachedDb.collection('org_invites').createIndex({ token: 1 }, { unique: true });
  await cachedDb.collection('customers').createIndex({ organizationId: 1, email: 1 });
  await cachedDb.collection('customer_timeline').createIndex({ organizationId: 1, customerId: 1, occurredAt: -1 });
  return cachedDb;
}

// ---------- JWT (HS256 via node crypto) ----------
const JWT_SECRET = process.env.JWT_SECRET || 'afinityos-dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'afinityos-dev-refresh';
const ACCESS_TTL = 60 * 15;
const REFRESH_TTL = 60 * 60 * 24 * 7;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}
function signJwt(payload, ttlSec, secret = JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSec };
  const headerB64 = b64url(JSON.stringify(header));
  const bodyB64 = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', secret).update(`${headerB64}.${bodyB64}`).digest();
  return `${headerB64}.${bodyB64}.${b64url(sig)}`;
}
function verifyJwt(token, secret = JWT_SECRET) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = b64url(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  if (s !== expected) return null;
  try {
    const payload = JSON.parse(b64urlDecode(p).toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const test = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch {
    return false;
  }
}

const VALID_ROLES = ['super_admin', 'org_admin', 'sales', 'marketing', 'support', 'executive', 'standard_user'];
const ADMIN_ROLES = ['super_admin', 'org_admin'];
const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  org_admin: ['org:manage', 'users:manage', 'billing:view', 'analytics:view', 'sales:view', 'marketing:view', 'support:view'],
  sales: ['sales:view', 'sales:edit', 'customer360:view', 'analytics:view'],
  marketing: ['marketing:view', 'marketing:edit', 'customer360:view', 'analytics:view'],
  support: ['support:view', 'support:edit', 'customer360:view'],
  executive: ['analytics:view', 'sales:view', 'marketing:view', 'support:view', 'billing:view'],
  standard_user: ['dashboard:view', 'profile:edit'],
};

function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, _id, ...rest } = u;
  return rest;
}
function clean(o) {
  if (!o) return o;
  const { _id, ...rest } = o;
  return rest;
}

async function getAuthUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const payload = verifyJwt(token);
  if (!payload) return null;
  const db = await getDb();
  const user = await db.collection('users').findOne({ id: payload.sub });
  return user ? sanitizeUser(user) : null;
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}
function errorJson(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ---------- Demo seeding helpers ----------
const FIRST_NAMES = ['Mira', 'Daniel', 'Sara', 'James', 'Aria', 'Diego', 'Lena', 'Noah', 'Priya', 'Owen', 'Maya', 'Leo'];
const LAST_NAMES = ['Chen', 'Park', 'Liu', 'Wu', 'Patel', 'Torres', 'Gomez', 'Smith', 'Khan', 'Kelly', 'Park', 'Garcia'];
const COMPANIES = ['Acme Corp', 'Globex Inc', 'Initech', 'Umbrella LLC', 'Soylent Co', 'Stark Industries', 'Wayne Enterprises', 'Hooli', 'Pied Piper'];
const SEGMENTS = ['Strategic', 'Growth', 'Mid-Market', 'SMB'];
const PLANS = ['Enterprise', 'Business', 'Pro', 'Starter'];
const TAGS = ['VIP', 'Renewal', 'Champion', 'Expansion', 'Risk', 'Beta'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(d) { return new Date(Date.now() - d * 24 * 3600 * 1000); }

function buildDemoTimeline(orgId, customerId) {
  const events = [
    { type: 'signup', title: 'Customer onboarded', description: 'Signed contract and activated workspace.', actor: { name: 'System', type: 'system' }, daysAgo: 240 },
    { type: 'email_sent', title: 'Welcome series sent', description: 'Sequence "Onboarding 7-day" enrolled.', actor: { name: 'Lumen', type: 'ai' }, daysAgo: 239 },
    { type: 'email_opened', title: 'Opened "Getting started with AfinityOS"', actor: { name: 'Lumen', type: 'ai' }, daysAgo: 238 },
    { type: 'call', title: 'Discovery call', description: '30-min discovery call with Head of Ops.', actor: { name: 'Mira Chen', type: 'user' }, daysAgo: 230 },
    { type: 'deal_created', title: 'Created opportunity', description: '$48,000 \u2014 Platform Expansion', actor: { name: 'Mira Chen', type: 'user' }, daysAgo: 200 },
    { type: 'ticket_opened', title: 'Ticket T-10428 opened', description: 'SAML SSO not redirecting', actor: { name: 'Customer', type: 'user' }, daysAgo: 60 },
    { type: 'ai_call', title: 'AI agent Aria handled support call', description: '4-min call \u2014 resolved billing question.', actor: { name: 'Aria', type: 'ai' }, daysAgo: 55 },
    { type: 'reward_earned', title: 'Earned Gold tier', description: '+5,000 loyalty points credited.', actor: { name: 'Rewards engine', type: 'system' }, daysAgo: 40 },
    { type: 'deal_won', title: 'Closed-Won \u2014 $180,000', description: 'Annual contract renewed with expansion.', actor: { name: 'Mira Chen', type: 'user' }, daysAgo: 30 },
    { type: 'policy_issued', title: 'Policy CYB-2024-882 issued', description: 'Cyber-Liability \u2014 $2M coverage.', actor: { name: 'Orion', type: 'ai' }, daysAgo: 20 },
    { type: 'payment', title: 'Payment received \u2014 $14,800', description: 'Invoice INV-00284 paid via ACH.', actor: { name: 'Stripe', type: 'system' }, daysAgo: 14 },
    { type: 'note', title: 'Internal note', description: 'Champion confirmed budget for Q4 expansion.', actor: { name: 'Daniel Park', type: 'user' }, daysAgo: 5 },
  ];
  return events.map((e) => ({
    id: uuidv4(),
    organizationId: orgId,
    customerId,
    type: e.type,
    title: e.title,
    description: e.description || '',
    actor: e.actor,
    occurredAt: daysAgo(e.daysAgo).toISOString(),
  }));
}

function buildDemoPolicies(orgId, customerId) {
  return [
    { id: uuidv4(), organizationId: orgId, customerId, policyNumber: 'CYB-2024-882', policyType: 'Cyber-Liability', status: 'Active', premium: 14800, coverage: '$2M', startDate: daysAgo(20).toISOString(), endDate: daysAgo(-345).toISOString() },
    { id: uuidv4(), organizationId: orgId, customerId, policyNumber: 'EO-2024-441', policyType: 'Errors & Omissions', status: 'Active', premium: 8200, coverage: '$1M', startDate: daysAgo(120).toISOString(), endDate: daysAgo(-245).toISOString() },
    { id: uuidv4(), organizationId: orgId, customerId, policyNumber: 'PROP-2023-118', policyType: 'Property', status: 'Expired', premium: 5400, coverage: '$500k', startDate: daysAgo(420).toISOString(), endDate: daysAgo(55).toISOString() },
  ];
}

function buildDemoTickets(orgId, customerId) {
  return [
    { id: uuidv4(), organizationId: orgId, customerId, ref: 'T-10428', subject: 'SAML SSO not redirecting', priority: 'High', status: 'Open', channel: 'Email', agent: 'Aria (AI)', createdAt: daysAgo(2).toISOString() },
    { id: uuidv4(), organizationId: orgId, customerId, ref: 'T-10391', subject: 'Bulk import failed for contacts', priority: 'Medium', status: 'Resolved', channel: 'Chat', agent: 'Sara Liu', createdAt: daysAgo(18).toISOString(), resolvedAt: daysAgo(17).toISOString() },
    { id: uuidv4(), organizationId: orgId, customerId, ref: 'T-10210', subject: 'Billing invoice discrepancy', priority: 'Low', status: 'Resolved', channel: 'Email', agent: 'Aria (AI)', createdAt: daysAgo(60).toISOString(), resolvedAt: daysAgo(59).toISOString() },
  ];
}

function buildDemoCampaigns(orgId, customerId) {
  return [
    { id: uuidv4(), organizationId: orgId, customerId, campaignName: 'Expansion-EU Q3', channel: 'LinkedIn + Email', status: 'Live', sent: 4, opened: 4, clicked: 2, converted: 1, occurredAt: daysAgo(8).toISOString() },
    { id: uuidv4(), organizationId: orgId, customerId, campaignName: 'Renewal Nudge', channel: 'Email', status: 'Completed', sent: 3, opened: 3, clicked: 2, converted: 1, occurredAt: daysAgo(28).toISOString() },
    { id: uuidv4(), organizationId: orgId, customerId, campaignName: 'AI Workforce Launch', channel: 'Multi-channel', status: 'Completed', sent: 2, opened: 2, clicked: 1, converted: 0, occurredAt: daysAgo(60).toISOString() },
  ];
}

function buildDemoRewards(orgId, customerId) {
  return {
    id: uuidv4(), organizationId: orgId, customerId,
    tier: 'Gold', pointsBalance: 8420, lifetimePoints: 24800, lastEarned: daysAgo(40).toISOString(),
    perks: ['Priority support', 'Dedicated CSM', '15% renewal discount', 'Early access to AI agents'],
    history: [
      { event: 'Renewal bonus', points: 5000, when: daysAgo(40).toISOString() },
      { event: 'Referral \u2014 Globex Inc', points: 2500, when: daysAgo(90).toISOString() },
      { event: 'Annual review', points: 1000, when: daysAgo(120).toISOString() },
    ],
  };
}

function buildDemoCalls(orgId, customerId) {
  return [
    {
      id: uuidv4(), organizationId: orgId, customerId, type: 'ai', direction: 'Inbound',
      durationSec: 248, agent: 'Aria (AI)', sentiment: 'positive',
      summary: 'Customer asked about billing schedule; Aria explained pro-rated annual contract and offered an updated invoice. Customer satisfied.',
      transcript: [
        { speaker: 'Customer', text: 'Hi, I had a question about my last invoice.', ts: 0 },
        { speaker: 'Aria (AI)', text: 'Of course \u2014 I can see invoice INV-00284 for $14,800. What would you like to know?', ts: 6 },
        { speaker: 'Customer', text: 'It seems higher than last month.', ts: 14 },
        { speaker: 'Aria (AI)', text: 'That\u2019s correct \u2014 you added 12 seats on the 15th, pro-rated for 16 days.', ts: 18 },
      ],
      occurredAt: daysAgo(55).toISOString(),
    },
    {
      id: uuidv4(), organizationId: orgId, customerId, type: 'voice', direction: 'Outbound',
      durationSec: 1820, agent: 'Mira Chen', sentiment: 'positive',
      summary: 'Discovery call with Head of Ops. Reviewed expansion plans and confirmed Q4 budget. Next step: send proposal.',
      transcript: [],
      occurredAt: daysAgo(230).toISOString(),
    },
    {
      id: uuidv4(), organizationId: orgId, customerId, type: 'ai', direction: 'Outbound',
      durationSec: 132, agent: 'Vega (AI)', sentiment: 'neutral',
      summary: 'Renewal reminder call; customer confirmed received and will respond by EOW.',
      transcript: [],
      occurredAt: daysAgo(10).toISOString(),
    },
  ];
}

async function seedDemoCustomers(db, orgId, ownerName, count = 6) {
  const customers = [];
  for (let i = 0; i < count; i++) {
    const fn = rand(FIRST_NAMES);
    const ln = rand(LAST_NAMES);
    const co = COMPANIES[i % COMPANIES.length];
    const id = uuidv4();
    const c = {
      id, organizationId: orgId,
      firstName: fn, lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${co.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      phone: `+1 555 0${randInt(10, 99)} ${randInt(1000, 9999)}`,
      company: co,
      jobTitle: rand(['Head of Ops', 'VP Sales', 'Director', 'CTO', 'COO', 'Procurement Lead']),
      segment: rand(SEGMENTS),
      plan: rand(PLANS),
      healthScore: randInt(35, 98),
      lifetimeValue: randInt(40, 480) * 1000,
      mrr: randInt(2, 48) * 1000,
      address: rand(['San Francisco, CA', 'New York, NY', 'Austin, TX', 'London, UK', 'Berlin, DE']),
      avatarUrl: null,
      tags: [rand(TAGS), rand(TAGS)].filter((v, idx, a) => a.indexOf(v) === idx),
      ownerName,
      createdAt: daysAgo(randInt(60, 365)).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    customers.push(c);
    await db.collection('customers').insertOne(c);
    await db.collection('customer_timeline').insertMany(buildDemoTimeline(orgId, id));
    await db.collection('customer_policies').insertMany(buildDemoPolicies(orgId, id));
    await db.collection('customer_tickets').insertMany(buildDemoTickets(orgId, id));
    await db.collection('customer_campaigns').insertMany(buildDemoCampaigns(orgId, id));
    await db.collection('customer_rewards').insertOne(buildDemoRewards(orgId, id));
    await db.collection('customer_calls').insertMany(buildDemoCalls(orgId, id));
  }
  return customers.length;
}

// ---------- Main router ----------
async function handleRequest(request, { params }) {
  const resolvedParams = await params;
  const segments = resolvedParams?.path || [];
  const path = '/' + segments.join('/');
  const method = request.method;

  try {
    // Health
    if (path === '/health' && method === 'GET') {
      return json({ status: 'ok', service: 'afinityos', time: new Date().toISOString() });
    }

    // ---------- AUTH ----------
    if (path === '/auth/register' && method === 'POST') {
      const body = await request.json();
      const { email, password, name, orgName, role, inviteToken } = body || {};
      if (!email || !password || !name) return errorJson('email, password, name required');
      const db = await getDb();
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (existing) return errorJson('Email already registered', 409);

      let orgId, org, userRole;

      if (inviteToken) {
        const invite = await db.collection('org_invites').findOne({ token: inviteToken });
        if (!invite) return errorJson('Invalid invite token', 400);
        if (invite.status !== 'pending') return errorJson('Invite already used', 400);
        if (new Date(invite.expiresAt) < new Date()) return errorJson('Invite expired', 400);
        if (invite.email.toLowerCase() !== email.toLowerCase()) return errorJson('Email does not match invite', 400);
        org = await db.collection('organizations').findOne({ id: invite.organizationId });
        if (!org) return errorJson('Organization not found', 400);
        orgId = invite.organizationId;
        userRole = invite.role;
        await db.collection('org_invites').updateOne({ id: invite.id }, { $set: { status: 'accepted', acceptedAt: new Date().toISOString() } });
      } else {
        orgId = uuidv4();
        org = {
          id: orgId,
          name: orgName || `${name}'s Organization`,
          logoUrl: null,
          timezone: 'America/Los_Angeles',
          currency: 'USD',
          language: 'en-US',
          plan: 'starter',
          settings: { brandColor: '#7c3aed' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.collection('organizations').insertOne(org);
        userRole = VALID_ROLES.includes(role) ? role : 'org_admin';
      }

      const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        name,
        passwordHash: hashPassword(password),
        role: userRole,
        permissions: ROLE_PERMISSIONS[userRole] || [],
        organizationId: orgId,
        avatarUrl: null,
        title: null,
        phone: null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('users').insertOne(user);

      const accessToken = signJwt({ sub: user.id, email: user.email, role: user.role, orgId }, ACCESS_TTL);
      const refreshToken = signJwt({ sub: user.id, type: 'refresh', jti: uuidv4() }, REFRESH_TTL, JWT_REFRESH_SECRET);
      await db.collection('refresh_tokens').insertOne({
        token: refreshToken,
        userId: user.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
      });

      return json({ user: sanitizeUser(user), organization: clean(org), accessToken, refreshToken, expiresIn: ACCESS_TTL }, 201);
    }

    if (path === '/auth/login' && method === 'POST') {
      const body = await request.json();
      const { email, password } = body || {};
      if (!email || !password) return errorJson('email and password required');
      const db = await getDb();
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!user) return errorJson('Invalid credentials', 401);
      if (!verifyPassword(password, user.passwordHash)) return errorJson('Invalid credentials', 401);

      const accessToken = signJwt({ sub: user.id, email: user.email, role: user.role, orgId: user.organizationId }, ACCESS_TTL);
      const refreshToken = signJwt({ sub: user.id, type: 'refresh', jti: uuidv4() }, REFRESH_TTL, JWT_REFRESH_SECRET);
      await db.collection('refresh_tokens').insertOne({
        token: refreshToken,
        userId: user.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
      });
      const org = await db.collection('organizations').findOne({ id: user.organizationId });
      return json({ user: sanitizeUser(user), organization: clean(org), accessToken, refreshToken, expiresIn: ACCESS_TTL });
    }

    if (path === '/auth/refresh' && method === 'POST') {
      const body = await request.json();
      const { refreshToken } = body || {};
      if (!refreshToken) return errorJson('refreshToken required');
      const payload = verifyJwt(refreshToken, JWT_REFRESH_SECRET);
      if (!payload || payload.type !== 'refresh') return errorJson('Invalid refresh token', 401);
      const db = await getDb();
      const stored = await db.collection('refresh_tokens').findOne({ token: refreshToken });
      if (!stored) return errorJson('Refresh token revoked', 401);
      const user = await db.collection('users').findOne({ id: payload.sub });
      if (!user) return errorJson('User not found', 404);
      const newAccess = signJwt({ sub: user.id, email: user.email, role: user.role, orgId: user.organizationId }, ACCESS_TTL);
      const newRefresh = signJwt({ sub: user.id, type: 'refresh', jti: uuidv4() }, REFRESH_TTL, JWT_REFRESH_SECRET);
      await db.collection('refresh_tokens').deleteOne({ token: refreshToken });
      await db.collection('refresh_tokens').insertOne({ token: newRefresh, userId: user.id, createdAt: new Date(), expiresAt: new Date(Date.now() + REFRESH_TTL * 1000) });
      return json({ accessToken: newAccess, refreshToken: newRefresh, expiresIn: ACCESS_TTL });
    }

    if (path === '/auth/logout' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { refreshToken } = body || {};
      if (refreshToken) {
        const db = await getDb();
        await db.collection('refresh_tokens').deleteOne({ token: refreshToken });
      }
      return json({ success: true });
    }

    if (path === '/auth/forgot-password' && method === 'POST') {
      const body = await request.json();
      const { email } = body || {};
      if (!email) return errorJson('email required');
      const db = await getDb();
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (user) {
        const resetToken = signJwt({ sub: user.id, type: 'reset' }, 60 * 60);
        await db.collection('password_resets').insertOne({ token: resetToken, userId: user.id, createdAt: new Date(), expiresAt: new Date(Date.now() + 3600 * 1000) });
      }
      return json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    if (path === '/auth/me' && method === 'GET') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const db = await getDb();
      const org = await db.collection('organizations').findOne({ id: user.organizationId });
      return json({ user, organization: clean(org) });
    }

    if (path === '/auth/profile' && method === 'PUT') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const body = await request.json();
      const allowed = ['name', 'title', 'phone', 'avatarUrl'];
      const update = {};
      for (const k of allowed) if (k in body) update[k] = body[k];
      update.updatedAt = new Date().toISOString();
      const db = await getDb();
      await db.collection('users').updateOne({ id: user.id }, { $set: update });
      const fresh = await db.collection('users').findOne({ id: user.id });
      return json({ user: sanitizeUser(fresh) });
    }

    if (path === '/auth/roles' && method === 'GET') {
      return json({ roles: VALID_ROLES, permissions: ROLE_PERMISSIONS });
    }

    // ---------- ORGANIZATION ----------
    if (path === '/organization' && method === 'GET') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const db = await getDb();
      const org = await db.collection('organizations').findOne({ id: user.organizationId });
      if (!org) return errorJson('Organization not found', 404);
      return json({ organization: clean(org) });
    }

    if (path === '/organization' && method === 'PUT') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      if (!ADMIN_ROLES.includes(user.role)) return errorJson('Forbidden', 403);
      const body = await request.json();
      const allowed = ['name', 'logoUrl', 'timezone', 'currency', 'language', 'plan', 'settings'];
      const update = {};
      for (const k of allowed) if (k in body) update[k] = body[k];
      update.updatedAt = new Date().toISOString();
      const db = await getDb();
      await db.collection('organizations').updateOne({ id: user.organizationId }, { $set: update });
      const fresh = await db.collection('organizations').findOne({ id: user.organizationId });
      return json({ organization: clean(fresh) });
    }

    if (path === '/organization/members' && method === 'GET') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const db = await getDb();
      const members = await db.collection('users').find({ organizationId: user.organizationId }).toArray();
      return json({ members: members.map(sanitizeUser) });
    }

    if (path.match(/^\/organization\/members\/[^/]+$/) && method === 'PUT') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      if (!ADMIN_ROLES.includes(user.role)) return errorJson('Forbidden', 403);
      const memberId = segments[2];
      const { role: newRole } = await request.json();
      if (!VALID_ROLES.includes(newRole)) return errorJson('Invalid role');
      const db = await getDb();
      const member = await db.collection('users').findOne({ id: memberId, organizationId: user.organizationId });
      if (!member) return errorJson('Member not found', 404);
      await db.collection('users').updateOne(
        { id: memberId },
        { $set: { role: newRole, permissions: ROLE_PERMISSIONS[newRole] || [], updatedAt: new Date().toISOString() } }
      );
      const fresh = await db.collection('users').findOne({ id: memberId });
      return json({ member: sanitizeUser(fresh) });
    }

    if (path.match(/^\/organization\/members\/[^/]+$/) && method === 'DELETE') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      if (!ADMIN_ROLES.includes(user.role)) return errorJson('Forbidden', 403);
      const memberId = segments[2];
      if (memberId === user.id) return errorJson('Cannot remove yourself');
      const db = await getDb();
      const result = await db.collection('users').deleteOne({ id: memberId, organizationId: user.organizationId });
      if (result.deletedCount === 0) return errorJson('Member not found', 404);
      await db.collection('refresh_tokens').deleteMany({ userId: memberId });
      return json({ success: true });
    }

    // ---------- INVITES ----------
    if (path === '/organization/invites' && method === 'GET') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const db = await getDb();
      const invites = await db.collection('org_invites').find({ organizationId: user.organizationId }).sort({ createdAt: -1 }).toArray();
      return json({ invites: invites.map(clean) });
    }

    if (path === '/organization/invites' && method === 'POST') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      if (!ADMIN_ROLES.includes(user.role)) return errorJson('Forbidden', 403);
      const { email, role } = await request.json();
      if (!email || !VALID_ROLES.includes(role)) return errorJson('email and valid role required');
      const db = await getDb();
      const existing = await db.collection('users').findOne({ email: email.toLowerCase(), organizationId: user.organizationId });
      if (existing) return errorJson('User already in organization', 409);
      const invite = {
        id: uuidv4(),
        token: uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''),
        organizationId: user.organizationId,
        email: email.toLowerCase(),
        role,
        status: 'pending',
        createdBy: user.id,
        createdByName: user.name,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      };
      await db.collection('org_invites').insertOne(invite);
      return json({ invite: clean(invite) }, 201);
    }

    if (path.match(/^\/organization\/invites\/[^/]+$/) && method === 'DELETE') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      if (!ADMIN_ROLES.includes(user.role)) return errorJson('Forbidden', 403);
      const inviteId = segments[2];
      const db = await getDb();
      await db.collection('org_invites').updateOne({ id: inviteId, organizationId: user.organizationId }, { $set: { status: 'cancelled' } });
      return json({ success: true });
    }

    // Public: preview invite by token
    if (path.match(/^\/invites\/[^/]+$/) && method === 'GET') {
      const token = segments[1];
      const db = await getDb();
      const invite = await db.collection('org_invites').findOne({ token });
      if (!invite) return errorJson('Invite not found', 404);
      const org = await db.collection('organizations').findOne({ id: invite.organizationId });
      return json({
        invite: {
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
          createdByName: invite.createdByName,
        },
        organization: org ? { id: org.id, name: org.name, logoUrl: org.logoUrl, plan: org.plan } : null,
      });
    }

    // ---------- CUSTOMERS ----------
    if (path === '/customers' && method === 'GET') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const url = new URL(request.url);
      const q = url.searchParams.get('q');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
      const db = await getDb();
      const query = { organizationId: user.organizationId };
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { company: rx }];
      }
      const customers = await db.collection('customers').find(query).sort({ updatedAt: -1 }).limit(limit).toArray();
      const total = await db.collection('customers').countDocuments({ organizationId: user.organizationId });
      return json({ customers: customers.map(clean), total });
    }

    if (path === '/customers' && method === 'POST') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const body = await request.json();
      if (!body.firstName || !body.lastName || !body.email) return errorJson('firstName, lastName, email required');
      const db = await getDb();
      const customer = {
        id: uuidv4(),
        organizationId: user.organizationId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email.toLowerCase(),
        phone: body.phone || '',
        company: body.company || '',
        jobTitle: body.jobTitle || '',
        segment: body.segment || 'Growth',
        plan: body.plan || 'Starter',
        healthScore: body.healthScore || 80,
        lifetimeValue: body.lifetimeValue || 0,
        mrr: body.mrr || 0,
        address: body.address || '',
        avatarUrl: body.avatarUrl || null,
        tags: body.tags || [],
        ownerName: body.ownerName || user.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('customers').insertOne(customer);
      // initial timeline event
      await db.collection('customer_timeline').insertOne({
        id: uuidv4(),
        organizationId: user.organizationId,
        customerId: customer.id,
        type: 'signup',
        title: 'Customer created',
        description: `Created by ${user.name}`,
        actor: { name: user.name, type: 'user' },
        occurredAt: new Date().toISOString(),
      });
      return json({ customer: clean(customer) }, 201);
    }

    if (path === '/customers/seed-demo' && method === 'POST') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const db = await getDb();
      const count = await seedDemoCustomers(db, user.organizationId, user.name, 6);
      return json({ success: true, seeded: count });
    }

    const customerMatch = path.match(/^\/customers\/([^/]+)(?:\/(.+))?$/);
    if (customerMatch) {
      const customerId = customerMatch[1];
      const sub = customerMatch[2];
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const db = await getDb();
      const customer = await db.collection('customers').findOne({ id: customerId, organizationId: user.organizationId });
      if (!customer) return errorJson('Customer not found', 404);

      // GET /customers/:id
      if (!sub && method === 'GET') {
        return json({ customer: clean(customer) });
      }
      // PUT /customers/:id
      if (!sub && method === 'PUT') {
        const body = await request.json();
        const allowed = ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'segment', 'plan', 'healthScore', 'lifetimeValue', 'mrr', 'address', 'avatarUrl', 'tags', 'ownerName'];
        const update = {};
        for (const k of allowed) if (k in body) update[k] = body[k];
        update.updatedAt = new Date().toISOString();
        await db.collection('customers').updateOne({ id: customerId }, { $set: update });
        const fresh = await db.collection('customers').findOne({ id: customerId });
        return json({ customer: clean(fresh) });
      }
      // DELETE /customers/:id
      if (!sub && method === 'DELETE') {
        await db.collection('customers').deleteOne({ id: customerId });
        await Promise.all([
          db.collection('customer_timeline').deleteMany({ customerId }),
          db.collection('customer_policies').deleteMany({ customerId }),
          db.collection('customer_tickets').deleteMany({ customerId }),
          db.collection('customer_campaigns').deleteMany({ customerId }),
          db.collection('customer_rewards').deleteMany({ customerId }),
          db.collection('customer_calls').deleteMany({ customerId }),
        ]);
        return json({ success: true });
      }

      const orgFilter = { organizationId: user.organizationId, customerId };

      if (sub === 'timeline' && method === 'GET') {
        const items = await db.collection('customer_timeline').find(orgFilter).sort({ occurredAt: -1 }).toArray();
        return json({ timeline: items.map(clean) });
      }
      if (sub === 'timeline' && method === 'POST') {
        const body = await request.json();
        const item = {
          id: uuidv4(),
          organizationId: user.organizationId,
          customerId,
          type: body.type || 'note',
          title: body.title || 'Note',
          description: body.description || '',
          actor: body.actor || { name: user.name, type: 'user' },
          occurredAt: new Date().toISOString(),
        };
        await db.collection('customer_timeline').insertOne(item);
        return json({ event: clean(item) }, 201);
      }
      if (sub === 'policies' && method === 'GET') {
        const items = await db.collection('customer_policies').find(orgFilter).sort({ startDate: -1 }).toArray();
        return json({ policies: items.map(clean) });
      }
      if (sub === 'tickets' && method === 'GET') {
        const items = await db.collection('customer_tickets').find(orgFilter).sort({ createdAt: -1 }).toArray();
        return json({ tickets: items.map(clean) });
      }
      if (sub === 'campaigns' && method === 'GET') {
        const items = await db.collection('customer_campaigns').find(orgFilter).sort({ occurredAt: -1 }).toArray();
        return json({ campaigns: items.map(clean) });
      }
      if (sub === 'rewards' && method === 'GET') {
        const item = await db.collection('customer_rewards').findOne(orgFilter);
        return json({ rewards: item ? clean(item) : null });
      }
      if (sub === 'calls' && method === 'GET') {
        const items = await db.collection('customer_calls').find(orgFilter).sort({ occurredAt: -1 }).toArray();
        return json({ calls: items.map(clean) });
      }
    }

    return errorJson(`Route ${method} ${path} not found`, 404);
  } catch (err) {
    console.error('API error:', err);
    return errorJson(err.message || 'Internal server error', 500);
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
export const PATCH = handleRequest;
