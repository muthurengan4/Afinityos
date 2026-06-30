import { NextResponse } from 'next/server';
import { getDb, clean } from './db';
import { eventBus } from './event-bus';
import { apiLogger } from './api-logger';
import { rateLimit, rateLimitKey } from './rate-limiter';

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
