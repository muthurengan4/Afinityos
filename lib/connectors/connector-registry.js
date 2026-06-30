import { SalesConnector } from './sales-connector';
import { MarketingConnector } from './marketing-connector';
import { SupportConnector } from './support-connector';
import { RewardsConnector } from './rewards-connector';
import { InsuranceConnector } from './insurance-connector';

/**
 * Connector registry — the single source of truth for all external-system bridges.
 * AI Agents discover tools via this registry, never by touching DBs directly.
 */
class ConnectorRegistry {
  constructor() {
    this.connectors = new Map();
  }
  register(connector) {
    this.connectors.set(connector.id, connector);
  }
  get(id) { return this.connectors.get(id); }
  list() { return Array.from(this.connectors.values()); }

  /** All tools across all connectors, in OpenAI / Anthropic function-calling format. */
  allToolSchemas() {
    return this.list().flatMap((c) => c.toolSchemas());
  }

  /** Resolve and call a fully-qualified tool name (e.g. "sales.create_lead"). */
  async callTool(fqName, params, ctx) {
    const [connectorId, toolName] = String(fqName).split('.');
    const connector = this.get(connectorId);
    if (!connector) return { ok: false, error: `Connector '${connectorId}' not found`, status: 404 };
    if (!toolName) return { ok: false, error: `Tool name missing. Use format 'connectorId.toolName'`, status: 400 };
    return await connector.callTool(toolName, params, ctx);
  }
}

export const connectorRegistry = new ConnectorRegistry();

if (!globalThis.__AFINITY_CONNECTORS_REGISTERED__) {
  connectorRegistry.register(new SalesConnector());
  connectorRegistry.register(new MarketingConnector());
  connectorRegistry.register(new SupportConnector());
  connectorRegistry.register(new RewardsConnector());
  connectorRegistry.register(new InsuranceConnector());
  globalThis.__AFINITY_CONNECTORS_REGISTERED__ = true;
}
