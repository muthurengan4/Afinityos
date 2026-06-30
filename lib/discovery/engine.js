import { v4 as uuidv4 } from 'uuid';
import { getDb, clean } from '@/lib/db';

/**
 * Runtime API discovery engine.
 * Probes a public host for OpenAPI specs and common REST patterns, captures status codes,
 * detects framework + auth scheme, and returns an Integration Discovery Report.
 */
const KNOWN_OPENAPI_PATHS = ['/openapi.json', '/api/openapi.json', '/swagger.json', '/api/swagger.json', '/v1/openapi.json', '/api/docs/openapi.json'];
const KNOWN_DOC_PATHS = ['/docs', '/api/docs', '/redoc', '/api/redoc', '/swagger', '/api/swagger'];
const KNOWN_HEALTH_PATHS = ['/health', '/api/health', '/healthz', '/api/healthz', '/api', '/api/', '/'];
const COMMON_ROUTES = [
  '/api/auth/login','/api/auth/register','/api/auth/refresh','/api/auth/me','/api/me',
  '/api/users','/api/customers','/api/organizations','/api/tenants','/api/roles',
  '/api/leads','/api/contacts','/api/accounts','/api/deals','/api/pipelines','/api/stages','/api/activities','/api/tasks','/api/meetings',
  '/api/campaigns','/api/templates','/api/emails','/api/channels/email/send','/api/channels/whatsapp/send','/api/ai/generate',
  '/api/tickets','/api/kb/search','/api/articles','/api/knowledge-base','/api/conversations',
  '/api/rewards','/api/points','/api/points/award','/api/points/redeem','/api/referrals','/api/referrals/campaigns','/api/tiers','/api/wallets','/api/redemptions','/api/catalog','/api/programs',
  '/api/policies','/api/quotes','/api/claims','/v1/quotes','/v1/policies','/v1/policies/search','/v1/policies/purchase','/v1/claims',
  '/api/notifications','/api/audit-logs','/api/webhooks','/api/integrations',
];

async function head(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'AfinityOS-Discovery/1.0', Accept: 'application/json' }, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    const ct = res.headers.get('content-type') || '';
    const wwwAuth = res.headers.get('www-authenticate') || null;
    let body = '';
    if (ct.includes('json') || ct.includes('text/plain')) {
      body = (await res.text()).slice(0, 500);
    }
    return { ok: true, status: res.status, contentType: ct, body, wwwAuth };
  } catch (e) {
    return { ok: false, error: e.message, status: 0 };
  }
}

function detectFramework(samples) {
  // FastAPI signature: {"detail":"Not Found"} on 404, application/json, sometimes /docs available.
  const jsonSamples = samples.filter((s) => s.contentType?.includes('json'));
  const fastapi = jsonSamples.some((s) => s.body && s.body.includes('"detail"'));
  // Go signature: plain text "404 page not found"
  const go = samples.some((s) => s.contentType?.startsWith('text/plain') && s.body?.includes('404 page not found'));
  // Express signature: "Cannot GET" plain HTML errors
  const express = samples.some((s) => s.body && s.body.includes('Cannot GET'));
  if (fastapi) return 'FastAPI (Python)';
  if (go) return 'Go HTTP (likely gin/chi/echo)';
  if (express) return 'Express (Node)';
  return 'Unknown';
}

function detectAuth(samples) {
  for (const s of samples) {
    if (s.status === 401) {
      const body = s.body || '';
      if (body.toLowerCase().includes('authorization') || body.toLowerCase().includes('bearer')) return 'Bearer JWT';
      if (body.toLowerCase().includes('api key') || body.toLowerCase().includes('apikey')) return 'API Key';
      if (s.wwwAuth) return `WWW-Authenticate: ${s.wwwAuth}`;
      return 'Token-based (401 returned)';
    }
    if (s.status === 403) {
      const body = s.body || '';
      if (body.toLowerCase().includes('not authenticated')) return 'Token-based (cookie/bearer)';
    }
  }
  return 'None detected (public endpoints only)';
}

export async function scanHost(baseUrl) {
  const url = baseUrl.replace(/\/$/, '');
  const startedAt = Date.now();
  const probes = [];
  // Try OpenAPI specs
  let openapi = null;
  for (const p of KNOWN_OPENAPI_PATHS) {
    const r = await head(`${url}${p}`);
    probes.push({ phase: 'openapi', path: p, ...r });
    if (r.ok && r.status === 200 && r.contentType?.includes('json') && r.body?.startsWith('{')) {
      try {
        const spec = JSON.parse(r.body.length === 500 ? (await (await fetch(`${url}${p}`)).text()) : r.body);
        if (spec.openapi || spec.swagger) { openapi = { path: p, version: spec.openapi || spec.swagger, info: spec.info, pathCount: Object.keys(spec.paths || {}).length }; break; }
      } catch {}
    }
  }
  // Health / root
  for (const p of KNOWN_HEALTH_PATHS) {
    const r = await head(`${url}${p}`);
    probes.push({ phase: 'health', path: p, ...r });
  }
  // Doc UIs (informational)
  for (const p of KNOWN_DOC_PATHS) {
    const r = await head(`${url}${p}`);
    probes.push({ phase: 'docs', path: p, status: r.status, contentType: r.contentType });
  }
  // Common routes
  const endpoints = [];
  for (const p of COMMON_ROUTES) {
    const r = await head(`${url}${p}`);
    probes.push({ phase: 'route', path: p, ...r });
    if (r.ok && [200, 401, 403, 405].includes(r.status)) {
      endpoints.push({ path: p, status: r.status, auth: [401, 403].includes(r.status), method: r.status === 405 ? 'POST (likely)' : 'GET', sample: r.body?.slice(0, 200) });
    }
  }
  const framework = detectFramework(probes);
  const authMechanism = detectAuth(probes);
  return {
    id: uuidv4(),
    baseUrl: url,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    framework,
    authMechanism,
    hasOpenApi: !!openapi,
    openapi,
    endpointsFound: endpoints.length,
    endpoints,
    rawProbeCount: probes.length,
  };
}

export async function saveReport(report, { organizationId, label = null }) {
  const db = await getDb();
  const doc = { ...report, organizationId, label, createdAt: new Date().toISOString() };
  await db.collection('discovery_reports').insertOne(doc);
  return clean(doc);
}

export async function listReports(organizationId) {
  const db = await getDb();
  return (await db.collection('discovery_reports').find({ organizationId }).sort({ createdAt: -1 }).limit(50).toArray()).map(clean);
}
