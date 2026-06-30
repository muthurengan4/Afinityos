import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';

/**
 * BaseConnector
 * - Abstract base for all external-system connectors.
 * - Handles auth header injection, timeouts, mock-mode fallback, per-org config overrides.
 * - Records every external call in `connector_calls` for audit + replay.
 *
 * Subclasses populate `this.tools` with:
 *   { name, description, parameters (JSON Schema), execute(params, connector, ctx) -> { ok, data, ... } }
 */
export class BaseConnector {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.envKey = config.envKey;          // e.g. 'CRM_AUTOMATION_REF'
    this.defaultBaseUrl = config.baseUrl || process.env[`${config.envKey}_URL`] || null;
    this.defaultApiKey = config.apiKey || process.env[`${config.envKey}_API_KEY`] || null;
    this.timeout = config.timeout || 12000;
    this.tools = [];
    this.documentation = config.documentation || null;
    this.category = config.category || 'integration';
    this.icon = config.icon || 'Plug';
  }

  /** Resolve effective config for an org — per-org overrides win over env. */
  async getConfig(organizationId) {
    let baseUrl = this.defaultBaseUrl;
    let apiKey = this.defaultApiKey;
    if (organizationId) {
      const db = await getDb();
      const cfg = await db.collection('connector_configs').findOne({ organizationId, connectorId: this.id });
      if (cfg?.baseUrl) baseUrl = cfg.baseUrl;
      if (cfg?.apiKey) apiKey = cfg.apiKey;
    }
    return { baseUrl, apiKey, configured: !!(baseUrl && apiKey) };
  }

  async setConfig(organizationId, { baseUrl, apiKey }) {
    const db = await getDb();
    await db.collection('connector_configs').updateOne(
      { organizationId, connectorId: this.id },
      { $set: { organizationId, connectorId: this.id, baseUrl, apiKey, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  toolSchemas() {
    return this.tools.map((t) => ({
      name: `${this.id}.${t.name}`,
      connector: this.id,
      description: t.description,
      parameters: t.parameters,
      requiredScopes: t.requiredScopes || [],
    }));
  }

  findTool(name) {
    return this.tools.find((t) => t.name === name);
  }

  /** Generic JSON HTTP call with timeout + mock fallback. */
  async request(method, path, { body, query, organizationId } = {}) {
    const cfg = await this.getConfig(organizationId);
    if (!cfg.configured) {
      return {
        ok: true,
        mode: 'mock',
        status: 200,
        note: `[${this.id}] connector not configured (set ${this.envKey}_URL and ${this.envKey}_API_KEY env vars, or POST /api/connectors/${this.id}/config). Returning MOCKED response shaped like the external API.`,
        data: this.mockResponse(method, path, body) || { _mocked: true, method, path, body, query },
      };
    }
    const url = new URL(path, cfg.baseUrl);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), this.timeout);
      const res = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          'X-Source': 'AfinityOS',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(t);
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      return { ok: res.ok, mode: 'live', status: res.status, data };
    } catch (e) {
      return { ok: false, mode: 'live', status: 0, error: e.message, data: null };
    }
  }

  /** Subclasses override to return realistic mock payloads per route. */
  mockResponse(_method, _path, _body) { return null; }

  /**
   * Execute a named tool. Persists a row in connector_calls regardless of mode.
   * Returns: { ok, mode, status, data, callId, durationMs }
   */
  async callTool(toolName, params, ctx = {}) {
    const tool = this.findTool(toolName);
    if (!tool) {
      return { ok: false, error: `Tool '${toolName}' not found in connector '${this.id}'`, status: 404 };
    }
    const startedAt = Date.now();
    let result;
    try {
      result = await tool.execute(params || {}, this, ctx);
    } catch (e) {
      result = { ok: false, mode: 'live', status: 500, error: e.message };
    }
    const callId = uuidv4();
    const durationMs = Date.now() - startedAt;
    try {
      const db = await getDb();
      await db.collection('connector_calls').insertOne({
        id: callId,
        connectorId: this.id,
        toolName,
        organizationId: ctx.organizationId || null,
        userId: ctx.userId || null,
        actor: ctx.actor || { type: 'user' },
        params,
        result,
        mode: result.mode || 'unknown',
        ok: !!result.ok,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    } catch { /* best-effort logging */ }
    return { ...result, callId, durationMs };
  }

  async testConnection(organizationId) {
    const cfg = await this.getConfig(organizationId);
    if (!cfg.configured) return { ok: false, mode: 'mock', message: `${this.id} connector not configured` };
    // Use a generic ping path; subclass can override.
    return await this.request('GET', this.healthPath || '/health', { organizationId });
  }

  manifest(installedConfigured = false) {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      icon: this.icon,
      envKey: this.envKey,
      configured: installedConfigured,
      defaultsFromEnv: { url: !!this.defaultBaseUrl, apiKey: !!this.defaultApiKey },
      tools: this.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
      toolCount: this.tools.length,
      documentation: this.documentation,
    };
  }
}
