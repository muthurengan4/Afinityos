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
  // indexes (idempotent)
  await cachedDb.collection('users').createIndex({ email: 1 }, { unique: true });
  await cachedDb.collection('refresh_tokens').createIndex({ token: 1 }, { unique: true });
  await cachedDb.collection('refresh_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await cachedDb.collection('organizations').createIndex({ id: 1 }, { unique: true });
  return cachedDb;
}

// ---------- JWT (HS256 via node crypto) ----------
const JWT_SECRET = process.env.JWT_SECRET || 'afinityos-dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'afinityos-dev-refresh';
const ACCESS_TTL = 60 * 15; // 15 minutes
const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 days

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

// ---------- Password hashing (scrypt) ----------
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

// ---------- Helpers ----------
const VALID_ROLES = [
  'super_admin',
  'org_admin',
  'sales',
  'marketing',
  'support',
  'executive',
  'standard_user',
];
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

// ---------- Route Handlers ----------
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
      const { email, password, name, orgName, role } = body || {};
      if (!email || !password || !name) return errorJson('email, password, name required');
      const db = await getDb();
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (existing) return errorJson('Email already registered', 409);

      // Create organization (first user becomes org_admin; or use provided role)
      const orgId = uuidv4();
      const org = {
        id: orgId,
        name: orgName || `${name}'s Organization`,
        plan: 'starter',
        createdAt: new Date().toISOString(),
      };
      await db.collection('organizations').insertOne(org);

      const userRole = VALID_ROLES.includes(role) ? role : 'org_admin';
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

      return json({
        user: sanitizeUser(user),
        organization: org,
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TTL,
      }, 201);
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
      return json({
        user: sanitizeUser(user),
        organization: org ? { id: org.id, name: org.name, plan: org.plan } : null,
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TTL,
      });
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
      // rotate
      await db.collection('refresh_tokens').deleteOne({ token: refreshToken });
      await db.collection('refresh_tokens').insertOne({
        token: newRefresh,
        userId: user.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
      });
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
      // For MVP: always respond success. Real flow would email a reset link.
      const db = await getDb();
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (user) {
        const resetToken = signJwt({ sub: user.id, type: 'reset' }, 60 * 60);
        await db.collection('password_resets').insertOne({
          token: resetToken,
          userId: user.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3600 * 1000),
        });
        // NOTE: email delivery not implemented in MVP
      }
      return json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    if (path === '/auth/me' && method === 'GET') {
      const user = await getAuthUser(request);
      if (!user) return errorJson('Unauthorized', 401);
      const db = await getDb();
      const org = await db.collection('organizations').findOne({ id: user.organizationId });
      return json({ user, organization: org ? { id: org.id, name: org.name, plan: org.plan } : null });
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

    // Roles & permissions metadata
    if (path === '/auth/roles' && method === 'GET') {
      return json({ roles: VALID_ROLES, permissions: ROLE_PERMISSIONS });
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
