import { v4 as uuidv4 } from 'uuid';
import { getDb, clean } from './db';

class EventBus {
  constructor() { this.listeners = new Map(); }
  static KNOWN_TYPES = ['customer.created','lead.created','campaign.sent','policy.purchased','ticket.opened','reward.issued','voice_call.completed'];
  knownTypes() { return EventBus.KNOWN_TYPES; }
  on(type, handler, { moduleId = 'anonymous' } = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ moduleId, handler });
  }
  allSubscriptions() {
    const out = {};
    for (const [t, list] of this.listeners.entries()) out[t] = list.map(l => l.moduleId);
    return out;
  }
  async emit(type, payload, { organizationId, actor } = {}, { db = null } = {}) {
    const event = {
      id: uuidv4(), type, organizationId: organizationId || null,
      payload: payload || {}, actor: actor || { type: 'system', name: 'system' },
      timestamp: new Date().toISOString(), processed: false, listenersInvoked: [],
    };
    const database = db || await getDb();
    await database.collection('events').insertOne(event);
    const handlers = this.listeners.get(type) || [];
    const invoked = [];
    for (const { moduleId, handler } of handlers) {
      const startedAt = Date.now();
      try {
        const r = await handler(event, { db: database });
        invoked.push({ moduleId, success: true, durationMs: Date.now() - startedAt, result: r || null });
      } catch (e) {
        invoked.push({ moduleId, success: false, durationMs: Date.now() - startedAt, error: e.message });
      }
    }
    await database.collection('events').updateOne({ id: event.id }, { $set: { processed: true, listenersInvoked: invoked } });
    return { ...event, processed: true, listenersInvoked: invoked };
  }
  async history({ organizationId, type = null, limit = 100 }) {
    const db = await getDb();
    const q = { organizationId };
    if (type) q.type = type;
    const items = await db.collection('events').find(q).sort({ timestamp: -1 }).limit(Math.min(limit, 500)).toArray();
    return items.map(clean);
  }
}

export const eventBus = new EventBus();
export { EventBus };
