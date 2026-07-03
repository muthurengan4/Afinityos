import { NextResponse } from 'next/server';
import { getDb, clean } from './db';
import { eventBus } from './event-bus';
import { apiLogger } from './api-logger';
import { rateLimit, rateLimitKey } from './rate-limiter';
import { connectorRegistry } from './connectors/connector-registry';
import { scanHost, saveReport, listReports } from './discovery/engine';
import { PREBAKED_REPORTS } from './discovery/prebaked-reports';
import { SSO_ROLES, isSsoAllowed, buildLaunchUrl } from './sso';

class Gateway {
  constructor() {
    this.modules = new Map();
    this.integrations = new Map();
  }
  register(manifest, handler) {
    if (!manifest?.id) throw new Error('Module manifest requires id');
    this.modules.set(manifest.id, { manifest: { ...manifest, registeredAt: new Date().toISOString() }, handler });
  }
  unregister(id) { this.modules.delete(id); }
  list() { return Array.from(this.modules.values()).map(({ manifest }) => manifest); }
  registerIntegration(id, config) { this.integrations.set(id, { ...config, registeredAt: new Date().toISOString() }); }
  listIntegrations() { return Array.from(this.integrations.entries()).map(([id, cfg]) => ({ id, ...cfg })); }

  static unauthorized(msg = 'Unauthorized') { return NextResponse.json({ error: msg }, { status: 401 }); }
  static forbidden(msg = 'Forbidden') { return NextResponse.json({ error: msg }, { status: 403 }); }
  static notFound(msg = 'Not found') { return NextResponse.json({ error: msg }, { status: 404 }); }
  static tooMany(info) { return NextResponse.json({ error: 'Too many requests', ...info }, { status: 429 }); }
  static ok(data, status = 200) { return NextResponse.json(data, { status }); }

  async dispatch(segments, ctx, deps) {
    const path = '/' + segments.join('/');
    const method = ctx.method;
    const req = ctx.request;

    if (path === '/gateway/health' && method === 'GET') {
      return Gateway.ok({ status: 'ok', service: 'afinityos-gateway', modules: this.modules.size, eventTypes: eventBus.knownTypes().length, time: new Date().toISOString() });
    }
    if (path === '/gateway/modules' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      ctx.user = user;
      const db = await getDb();
      const installs = await db.collection('module_installations').find({ organizationId: user.organizationId }).toArray();
      const installMap = Object.fromEntries(installs.map(i => [i.moduleId, i]));
      const subs = eventBus.allSubscriptions();
      const list = this.list().map(m => ({
        ...m,
        installed: installMap[m.id]?.installed ?? true,
        installedAt: installMap[m.id]?.installedAt || null,
        listening: Object.entries(subs).filter(([, mods]) => mods.includes(m.id)).map(([t]) => t),
      }));
      return Gateway.ok({ modules: list });
    }
    if (path === '/gateway/logs' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const db = await getDb();
      const url = new URL(req.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
      const logs = await db.collection('api_logs').find({ organizationId: user.organizationId }).sort({ timestamp: -1 }).limit(limit).toArray();
      return Gateway.ok({ logs: logs.map(clean) });
    }
    if (path === '/gateway/integrations' && method === 'GET') {
      return Gateway.ok({ integrations: this.listIntegrations() });
    }

    // ---------- Integration Discovery ----------
    if (path === '/discovery/reports' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const saved = await listReports(user.organizationId);
      return Gateway.ok({ reports: saved, prebaked: PREBAKED_REPORTS });
    }
    if (path === '/discovery/scan' && method === 'POST') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const body = await req.json().catch(() => ({}));
      if (!body?.url) return NextResponse.json({ error: 'url required' }, { status: 400 });
      const report = await scanHost(body.url);
      const saved = await saveReport(report, { organizationId: user.organizationId, label: body.label || null });
      return Gateway.ok({ report: saved });
    }
    if (path === '/discovery/prebaked' && method === 'GET') {
      return Gateway.ok({ reports: PREBAKED_REPORTS });
    }

    // ---------- Cross-app SSO Launch (admin / super_admin / executive only) ----------
    if (path === '/sso/status' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const allowed = isSsoAllowed(user);
      const list = await Promise.all(connectorRegistry.list().map(async (c) => {
        const cfg = await c.getConfig(user.organizationId);
        const canLaunch = !!(cfg.baseUrl && cfg.serviceEmail && cfg.servicePassword);
        return {
          connectorId: c.id,
          name: c.name,
          category: c.category,
          icon: c.icon,
          configured: cfg.configured,
          canLaunch,
          baseUrl: cfg.baseUrl || null,
          missing: canLaunch ? [] : [
            !cfg.baseUrl && 'baseUrl',
            !cfg.serviceEmail && 'serviceEmail',
            !cfg.servicePassword && 'servicePassword',
          ].filter(Boolean),
        };
      }));
      return Gateway.ok({ allowed, roles: SSO_ROLES, currentRole: user.role, connectors: list });
    }
    if (path === '/sso/launch' && method === 'POST') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      if (!isSsoAllowed(user)) {
        return Gateway.forbidden(`SSO launch requires one of: ${SSO_ROLES.join(', ')}`);
      }
      const body = await req.json().catch(() => ({}));
      const { connectorId, returnPath } = body;
      if (!connectorId) return NextResponse.json({ error: 'connectorId required' }, { status: 400 });
      const c = connectorRegistry.get(connectorId);
      if (!c) return Gateway.notFound(`Connector '${connectorId}' not found`);
      const cfg = await c.getConfig(user.organizationId);
      if (!cfg.baseUrl) return NextResponse.json({ error: `Connector '${connectorId}' has no baseUrl configured` }, { status: 400 });
      if (!cfg.serviceEmail || !cfg.servicePassword) {
        return NextResponse.json({
          error: `Connector '${connectorId}' has no service credentials. Set serviceEmail + servicePassword via POST /api/connectors/${connectorId}/config.`,
        }, { status: 400 });
      }
      const token = await c.loginAndGetToken(user.organizationId, cfg);
      if (!token) {
        return NextResponse.json({
          error: `Login to ${cfg.baseUrl}${c.loginPath || '/api/auth/login'} failed. Check service credentials.`,
        }, { status: 401 });
      }
      const launchUrl = buildLaunchUrl(cfg.baseUrl, { accessToken: token }, returnPath || '/', {
        connectorId,
        orgId: user.organizationId,
        launchedBy: { id: user.id, email: user.email, role: user.role },
      });
      // audit
      const db = await getDb();
      await db.collection('sso_launches').insertOne({
        id: `sso_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        organizationId: user.organizationId,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        connectorId,
        baseUrl: cfg.baseUrl,
        returnPath: returnPath || '/',
        timestamp: new Date().toISOString(),
      });
      return Gateway.ok({
        launchUrl,
        baseUrl: cfg.baseUrl,
        returnPath: returnPath || '/',
        connectorId,
        connectorName: c.name,
        expiresInSec: 600, // 10-min JWT cache
      });
    }
    if (path === '/sso/launches' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const db = await getDb();
      const rows = await db.collection('sso_launches')
        .find({ organizationId: user.organizationId })
        .sort({ timestamp: -1 }).limit(50).toArray();
      return Gateway.ok({ launches: rows.map(clean) });
    }

    // ---------- Connectors (external-system bridges + AI tools) ----------
    if (path === '/connectors' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const db = await getDb();
      const configs = await db.collection('connector_configs').find({ organizationId: user.organizationId }).toArray();
      const cfgMap = Object.fromEntries(configs.map((c) => [c.connectorId, c]));
      const list = await Promise.all(connectorRegistry.list().map(async (c) => {
        const cfg = await c.getConfig(user.organizationId);
        return { ...c.manifest(cfg.configured), perOrgOverride: !!cfgMap[c.id] };
      }));
      return Gateway.ok({ connectors: list });
    }
    const connectorIdMatch = path.match(/^\/connectors\/([^/]+)$/);
    if (connectorIdMatch && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const c = connectorRegistry.get(connectorIdMatch[1]);
      if (!c) return Gateway.notFound('Connector not found');
      const cfg = await c.getConfig(user.organizationId);
      return Gateway.ok({ connector: { ...c.manifest(cfg.configured), baseUrl: cfg.baseUrl ? `${cfg.baseUrl.replace(/^(https?:\/\/[^/]+).*/, '$1')}/\u2026` : null } });
    }
    const connectorConfigMatch = path.match(/^\/connectors\/([^/]+)\/config$/);
    if (connectorConfigMatch && method === 'POST') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      if (!['org_admin', 'super_admin'].includes(user.role)) return Gateway.forbidden();
      const c = connectorRegistry.get(connectorConfigMatch[1]);
      if (!c) return Gateway.notFound('Connector not found');
      const body = await req.json().catch(() => ({}));
      await c.setConfig(user.organizationId, { baseUrl: body.baseUrl, apiKey: body.apiKey, serviceEmail: body.serviceEmail, servicePassword: body.servicePassword });
      const cfg = await c.getConfig(user.organizationId);
      return Gateway.ok({ success: true, configured: cfg.configured });
    }
    const connectorTestMatch = path.match(/^\/connectors\/([^/]+)\/test$/);
    if (connectorTestMatch && method === 'POST') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const c = connectorRegistry.get(connectorTestMatch[1]);
      if (!c) return Gateway.notFound('Connector not found');
      const result = await c.testConnection(user.organizationId);
      return Gateway.ok({ result });
    }
    const connectorToolMatch = path.match(/^\/connectors\/([^/]+)\/tools\/([^/]+)$/);
    if (connectorToolMatch && method === 'POST') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const c = connectorRegistry.get(connectorToolMatch[1]);
      if (!c) return Gateway.notFound('Connector not found');
      const body = await req.json().catch(() => ({}));
      const result = await c.callTool(connectorToolMatch[2], body, {
        organizationId: user.organizationId,
        userId: user.id,
        actor: { id: user.id, name: user.name, type: 'user' },
      });
      return Gateway.ok({ result }, 200);
    }

    // ---------- AI tools (flat registry for Business Brain / agents) ----------
    if (path === '/ai-tools' && method === 'GET') {
      return Gateway.ok({ tools: connectorRegistry.allToolSchemas(), count: connectorRegistry.allToolSchemas().length });
    }
    if (path === '/ai-tools/call' && method === 'POST') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const body = await req.json().catch(() => ({}));
      if (!body?.tool) return NextResponse.json({ error: 'tool required (format: connectorId.toolName)' }, { status: 400 });
      const result = await connectorRegistry.callTool(body.tool, body.params || {}, {
        organizationId: user.organizationId,
        userId: user.id,
        actor: { id: user.id, name: user.name, type: 'ai_agent' },
      });
      return Gateway.ok({ result }, result.ok ? 200 : (result.status || 400));
    }
    if (path === '/ai-tools/calls' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const db = await getDb();
      const url = new URL(req.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
      const calls = await db.collection('connector_calls').find({ organizationId: user.organizationId }).sort({ timestamp: -1 }).limit(limit).toArray();
      return Gateway.ok({ calls: calls.map(clean) });
    }

    const installMatch = path.match(/^\/modules\/([^/]+)\/(install|uninstall)$/);
    if (installMatch && method === 'POST') {
      const moduleId = installMatch[1];
      const action = installMatch[2];
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      if (!['org_admin', 'super_admin'].includes(user.role)) return Gateway.forbidden();
      if (!this.modules.has(moduleId)) return Gateway.notFound('Module not found');
      const db = await getDb();
      await db.collection('module_installations').updateOne(
        { organizationId: user.organizationId, moduleId },
        { $set: { organizationId: user.organizationId, moduleId, installed: action === 'install', updatedAt: new Date().toISOString() }, $setOnInsert: { installedAt: action === 'install' ? new Date().toISOString() : null } },
        { upsert: true }
      );
      return Gateway.ok({ success: true, moduleId, action });
    }

    if (path === '/events/types' && method === 'GET') {
      return Gateway.ok({ types: eventBus.knownTypes(), subscriptions: eventBus.allSubscriptions() });
    }
    if (path === '/events' && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const url = new URL(req.url);
      const type = url.searchParams.get('type');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
      const events = await eventBus.history({ organizationId: user.organizationId, type, limit });
      return Gateway.ok({ events });
    }
    if (path === '/events' && method === 'POST') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const body = await req.json().catch(() => ({}));
      if (!body?.type) return NextResponse.json({ error: 'type required' }, { status: 400 });
      const event = await eventBus.emit(body.type, body.payload || {}, { organizationId: user.organizationId, actor: { id: user.id, name: user.name, type: 'user' } });
      return Gateway.ok({ event }, 201);
    }
    const eventByIdMatch = path.match(/^\/events\/([^/]+)$/);
    if (eventByIdMatch && method === 'GET') {
      const user = await deps.getAuthUser(req);
      if (!user) return Gateway.unauthorized();
      const db = await getDb();
      const evt = await db.collection('events').findOne({ id: eventByIdMatch[1], organizationId: user.organizationId });
      if (!evt) return Gateway.notFound('Event not found');
      return Gateway.ok({ event: clean(evt) });
    }

    for (const [moduleId, { manifest, handler }] of this.modules.entries()) {
      const prefix = '/' + moduleId;
      if (path === prefix || path.startsWith(prefix + '/')) {
        const user = await deps.getAuthUser(req);
        if (!user) { await apiLogger.log({ ...ctx, module: moduleId }, 401); return Gateway.unauthorized(); }
        ctx.user = user;
        ctx.module = moduleId;
        const rl = rateLimit(rateLimitKey(ctx, `${moduleId}:${ctx.method}`), { max: 240, windowMs: 60_000 });
        if (!rl.allowed) { await apiLogger.log(ctx, 429); return Gateway.tooMany({ retryAt: new Date(rl.resetAt).toISOString(), limit: rl.limit }); }
        const db = await getDb();
        const install = await db.collection('module_installations').findOne({ organizationId: user.organizationId, moduleId });
        if (install && install.installed === false) { await apiLogger.log(ctx, 403); return Gateway.forbidden(`Module '${moduleId}' is not installed for this organization`); }
        const subpath = path.slice(prefix.length) || '/';
        try {
          const res = await handler(subpath, method, req, ctx, { db, eventBus });
          if (!res) { await apiLogger.log(ctx, 404); return Gateway.notFound(`No route in module '${moduleId}' for ${method} ${subpath}`); }
          await apiLogger.log(ctx, res.status);
          res.headers.set('X-RateLimit-Remaining', String(rl.remaining));
          res.headers.set('X-RateLimit-Limit', String(rl.limit));
          res.headers.set('X-Request-Id', ctx.requestId);
          res.headers.set('X-Module', moduleId);
          return res;
        } catch (e) {
          await apiLogger.log(ctx, 500, e.message);
          return NextResponse.json({ error: e.message }, { status: 500 });
        }
      }
    }

    return null;
  }
}

export const gateway = new Gateway();
export { Gateway };
